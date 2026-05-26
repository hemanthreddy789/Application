import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'prisma', 'dev.db')

class DelayPredictor:
    def __init__(self):
        self.version = 1

    def predict_task_risk(self, task_id: str):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT estimatedHours, status, deadline, assignedEmployeeId, progressPercentage FROM Task WHERE id = ?", (task_id,))
        task = cursor.fetchone()
        
        if not task:
            conn.close()
            return {"error": "Task not found"}

        est_hours, status, deadline_str, assigned_emp_id, progress = task
        
        # Calculate days until deadline
        deadline_date = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        days_remaining = (deadline_date.date() - datetime.utcnow().date()).days
        
        prob = 0.2 # base risk
        
        risk_factors = []
        actions = []
        
        if status == "Completed":
            prob = 0.0
            risk_factors.append({"factor": "Status", "contribution": -1.0, "detail": "Task is already completed."})
        else:
            if est_hours > 20:
                prob += 0.2
                risk_factors.append({"factor": "estimated_hours", "contribution": 0.2, "detail": f"{est_hours} hours is a large task"})
                
            if days_remaining <= 0:
                prob += 0.5
                risk_factors.append({"factor": "deadline", "contribution": 0.5, "detail": "Deadline is today or past due."})
                actions.append("Immediately review and extend deadline.")
            elif days_remaining < 3 and progress < 80:
                prob += 0.4
                risk_factors.append({"factor": "deadline_buffer", "contribution": 0.4, "detail": f"Only {days_remaining} days left with {progress}% complete."})
                actions.append("Prioritize this task or assign more help.")
                
            if assigned_emp_id:
                cursor.execute("SELECT onTimeDeliveryRate, averageCompletionSpeed, currentAllocatedHours, weeklyCapacityHours FROM Employee WHERE id = ?", (assigned_emp_id,))
                emp = cursor.fetchone()
                if emp:
                    on_time_rate, speed, curr_alloc, week_cap = emp
                    if on_time_rate < 80:
                        prob += 0.15
                        risk_factors.append({"factor": "employee_history", "contribution": 0.15, "detail": f"Assignee has {on_time_rate}% on-time rate."})
                    if speed > 1.2:
                        prob += 0.1
                        risk_factors.append({"factor": "employee_speed", "contribution": 0.1, "detail": "Assignee tends to take longer than estimated."})
                    if curr_alloc > week_cap:
                        prob += 0.3
                        risk_factors.append({"factor": "employee_overloaded", "contribution": 0.3, "detail": f"Assignee is severely overloaded ({curr_alloc}h allocated vs {week_cap}h capacity)."})
                        actions.append("Reassign task due to workload overload.")
                
                # Check for active leaves overlapping with deadline
                cursor.execute("SELECT leaveType FROM Leave WHERE employeeId = ? AND status = 'Approved' AND ? >= startDate AND ? <= endDate", (assigned_emp_id, deadline_str, deadline_str))
                leaves = cursor.fetchall()
                if leaves:
                    prob += 0.5
                    risk_factors.append({"factor": "employee_unavailable", "contribution": 0.5, "detail": f"Assignee is on Approved {leaves[0][0]} during task deadline."})
                    actions.append(f"Task deadline conflicts with employee leave ({leaves[0][0]}). Reassign immediately.")
            else:
                prob += 0.3
                risk_factors.append({"factor": "unassigned", "contribution": 0.3, "detail": "Task is not assigned to anyone yet."})
                actions.append("Assign task to an available employee.")
                
        conn.close()

        prob = min(max(prob, 0.0), 0.95)
            
        risk_level = "low"
        if prob > 0.6:
            risk_level = "high"
        elif prob > 0.3:
            risk_level = "medium"

        return {
            "task_id": task_id,
            "delay_probability": round(prob, 2),
            "risk_level": risk_level,
            "top_risk_factors": risk_factors,
            "recommended_actions": actions if actions else ["Monitor progress regularly"],
            "confidence": 0.85
        }
