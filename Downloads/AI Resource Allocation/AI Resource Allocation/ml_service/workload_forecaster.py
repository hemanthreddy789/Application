import os
import sqlite3
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'prisma', 'dev.db')

def parse_db_date(val):
    if val is None:
        return None
    if isinstance(val, int) or (isinstance(val, str) and val.isdigit()):
        ts = int(val)
        if ts > 1e10:
            ts = ts / 1000.0
        return datetime.utcfromtimestamp(ts).date()
    s = str(val).split('T')[0][:10]
    return datetime.strptime(s, '%Y-%m-%d').date()

class WorkloadForecaster:
    def __init__(self):
        self.version = 1

    def forecast_employee_capacity(self, employee_id: str, days: int = 28):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT name, currentAllocatedHours, weeklyCapacityHours, onTimeDeliveryRate, averageCompletionSpeed FROM Employee WHERE id = ?", (employee_id,))
        emp_data = cursor.fetchone()
        if not emp_data:
            conn.close()
            return {"error": "Employee not found"}

        name, current_allocated, weekly_capacity, on_time_rate, avg_speed = emp_data
        if weekly_capacity == 0:
            weekly_capacity = 50

        # Active tasks with deadlines
        cursor.execute("""
            SELECT id, title, estimatedHours, deadline, priority, progressPercentage
            FROM Task WHERE assignedEmployeeId = ? AND status != 'Completed'
            ORDER BY deadline ASC
        """, (employee_id,))
        active_tasks = cursor.fetchall()

        # Leaves
        cursor.execute("SELECT startDate, endDate, leaveType FROM Leave WHERE employeeId = ? AND status = 'Approved'", (employee_id,))
        leaves = cursor.fetchall()

        # Holidays
        cursor.execute("SELECT date, name FROM Holiday")
        holidays_raw = cursor.fetchall()
        holidays = {}
        for row in holidays_raw:
            try:
                d = parse_db_date(row[0])
                if d:
                    holidays[d.isoformat()] = row[1]
            except Exception:
                pass

        today = datetime.utcnow().date()

        # Urgent tasks (crunch time) — must be BEFORE conn.close()
        urgent_count = 0
        for t in active_tasks:
            if t[3] and t[4] == 'Urgent':
                try:
                    d = parse_db_date(t[3])
                    if d and (d - today).days < 7:
                        urgent_count += 1
                except Exception:
                    pass
        is_crunch_time = urgent_count > 0

        conn.close()

        parsed_leaves = []
        for start, end, ltype in leaves:
            try:
                s = parse_db_date(start)
                e = parse_db_date(end)
                if s and e:
                    parsed_leaves.append((s.isoformat(), e.isoformat(), ltype))
            except Exception:
                pass

        # Build a daily-release schedule: tasks free up capacity as they complete
        # Estimate which tasks complete on which day
        daily_released = {}  # date -> hours released
        working_hours_per_day = weekly_capacity / 5  # hours per working day

        for task in active_tasks:
            tid, title, est_hours, deadline_raw, priority, progress = task
            if not deadline_raw:
                continue
            try:
                deadline_date = parse_db_date(deadline_raw)
            except Exception:
                continue
            remaining_hours = est_hours * (1 - (progress or 0) / 100)
            remaining_hours *= avg_speed  # adjust for employee speed

            # Estimate completion: task finishes at or before deadline
            est_complete_day = today + timedelta(days=int(remaining_hours / working_hours_per_day) + 1)
            complete_day = min(est_complete_day, deadline_date)
            key = complete_day.isoformat()
            daily_released[key] = daily_released.get(key, 0) + est_hours

        # Generate daily forecast
        forecast = []
        current_alloc = float(current_allocated)
        peak_overload_dates = []
        available_windows = []
        leave_periods = []
        crunch_days = []
        window_start = None

        for i in range(days):
            date = today + timedelta(days=i)
            date_str = date.isoformat()

            # Release completed task hours
            released = daily_released.get(date_str, 0)
            current_alloc = max(0, current_alloc - released)

            utilization = (current_alloc / weekly_capacity) * 100

            # Determine day type
            is_weekend = date.weekday() >= 5
            is_holiday = date_str in holidays
            holiday_name = holidays.get(date_str, '')

            is_leave = False
            leave_type = ''
            for s, e, ltype in parsed_leaves:
                if s <= date_str <= e:
                    is_leave = True
                    leave_type = ltype
                    break

            if is_leave:
                daily_pred = 0.0
                status = f"On {leave_type}"
                color = "leave"
                leave_periods.append(date_str)
            elif is_holiday:
                if is_crunch_time:
                    daily_pred = round(utilization * 0.5, 1)
                    status = f"Holiday (Crunch Overtime) — {holiday_name}"
                    color = "crunch"
                    crunch_days.append(date_str)
                else:
                    daily_pred = 0.0
                    status = f"Holiday — {holiday_name}"
                    color = "holiday"
            elif is_weekend:
                if is_crunch_time:
                    daily_pred = round(utilization * 0.5, 1)
                    status = "Weekend Crunch Overtime"
                    color = "crunch"
                    crunch_days.append(date_str)
                else:
                    daily_pred = 0.0
                    status = "Weekend"
                    color = "off"
            else:
                daily_pred = round(utilization, 1)
                if utilization >= 100:
                    status = "Overloaded"
                    color = "overloaded"
                    peak_overload_dates.append(date_str)
                elif utilization >= 80:
                    status = "High Load"
                    color = "high"
                elif utilization >= 50:
                    status = "Moderate"
                    color = "moderate"
                else:
                    status = "Available"
                    color = "available"

            # Track availability windows (working days, <60% utilization)
            if color == "available" and not is_weekend and not is_leave and not is_holiday:
                if window_start is None:
                    window_start = date_str
            else:
                if window_start:
                    window_days = (date - datetime.fromisoformat(window_start).date()).days
                    if window_days >= 2:
                        available_windows.append({
                            "start": window_start,
                            "end": (date - timedelta(days=1)).isoformat(),
                            "days": window_days
                        })
                    window_start = None

            confidence_low = max(0, round(daily_pred - 12, 1))
            confidence_high = round(daily_pred + 12, 1)

            forecast.append({
                "date": date_str,
                "day_label": date.strftime("%d %b"),
                "weekday": date.strftime("%a"),
                "predicted_capacity": daily_pred,
                "confidence_interval": [confidence_low, confidence_high],
                "status": status,
                "color": color,
                "is_working_day": not (is_weekend or is_leave or is_holiday),
                "released_hours": round(released, 1),
            })

        # Close last window
        if window_start:
            last_date = today + timedelta(days=days - 1)
            window_days = (last_date - datetime.fromisoformat(window_start).date()).days + 1
            if window_days >= 2:
                available_windows.append({
                    "start": window_start,
                    "end": last_date.isoformat(),
                    "days": window_days
                })

        # Best assignment window
        best_window = sorted(available_windows, key=lambda w: w['days'], reverse=True)[0] if available_windows else None
        if best_window:
            s = datetime.fromisoformat(best_window['start']).strftime("%d %b")
            e = datetime.fromisoformat(best_window['end']).strftime("%d %b")
            recommended_window = f"{s} – {e} ({best_window['days']} working days free)"
        else:
            recommended_window = "No clear availability window in the next 28 days."

        # Summary insight
        overload_days = len(peak_overload_dates)
        free_days = len([f for f in forecast if f['color'] == 'available'])

        if overload_days >= 5:
            insight = f"🔴 Critical: {name} is severely overloaded for {overload_days} working days. Reassign tasks immediately."
        elif overload_days > 0:
            insight = f"🟡 Caution: {name} will be overloaded on {overload_days} day(s). Monitor and consider load balancing."
        elif leave_periods:
            insight = f"🏖️ {name} has approved leave during this period. Plan task assignments around leave dates."
        elif free_days >= 10:
            insight = f"🟢 {name} has strong availability ({free_days} free working days). Good candidate for new task assignment."
        else:
            insight = f"🔵 {name} is moderately loaded. Use the best availability window below for any new task."

        return {
            "employee_id": employee_id,
            "employee_name": name,
            "current_utilization": round((current_allocated / weekly_capacity) * 100, 1),
            "weekly_capacity": weekly_capacity,
            "current_allocated": current_allocated,
            "active_task_count": len(active_tasks),
            "active_tasks": [{"title": t[1], "hours": t[2], "deadline": t[3], "priority": t[4], "progress": t[5]} for t in active_tasks],
            "forecast": forecast,
            "peak_overload_dates": peak_overload_dates[:10],
            "available_windows": available_windows[:5],
            "recommended_assignment_window": recommended_window,
            "leave_periods": leave_periods,
            "crunch_days": crunch_days,
            "insight": insight,
            "is_crunch_time": is_crunch_time,
        }

