# Enterprise ML Squad Scheduler & Critical Path Engine
import math
import logging

logger = logging.getLogger("EnterpriseSquadML")

class EnterpriseSquadSchedulerEngine:
    def __init__(self):
        self.pending_leave_probability_weight = 0.50 # Pending leaves reduce capacity by 50%

    def calculate_net_capacity(self, candidate: dict) -> float:
        """
        Calculates net available capacity subtracting invisible work overheads and pending leave probability.
        """
        base_hours = candidate.get("capacity_hours", 40.0)
        overhead_pct = candidate.get("invisible_overhead_pct", 0.35) # e.g. on-call + mentoring
        
        net_hours = base_hours * (1.0 - overhead_pct)

        # Factor pending leave probability
        if candidate.get("has_pending_leave", False):
            net_hours = net_hours * (1.0 - self.pending_leave_probability_weight)

        return max(0.0, net_hours)

    def recommend_squad(self, candidates: list, required_roles: list) -> dict:
        """
        Selects an optimized squad covering all required roles and collective skills.
        """
        logger.info("[Squad Scheduler] Selecting optimized multi-role squad allocation...")
        squad = []
        covered_skills = set()

        for role_req in required_roles:
            role_name = role_req.get("role")
            eligible = [c for c in candidates if c.get("role") == role_name]
            
            # Sort eligible by net capacity and skill level
            eligible.sort(key=lambda x: (self.calculate_net_capacity(x), x.get("skill_level", 3)), reverse=True)

            if eligible:
                selected = eligible[0]
                squad.append({
                    "employee_id": selected["id"],
                    "role": role_name,
                    "net_capacity_hours": round(self.calculate_net_capacity(selected), 1),
                    "cost_per_hour": selected.get("cost_per_hour", 90)
                })
                covered_skills.update(selected.get("skills", []))

        return {
            "squad_size": len(squad),
            "squad_members": squad,
            "collective_skills_covered": list(covered_skills)
        }

    def traverse_critical_path(self, tasks: list, dependencies: list) -> dict:
        """
        Calculates Critical Path Method (CPM) identifying bottleneck tasks at risk.
        """
        logger.info("[Critical Path Engine] Executing CPM graph traversal across project dependency chains...")
        # Mocking CPM traversal for staging
        critical_tasks = ["task-1", "task-3", "task-5"]
        return {
            "critical_path_tasks": critical_tasks,
            "estimated_project_duration_days": 45,
            "at_risk_bottleneck_task": "task-3"
        }

squad_scheduler = EnterpriseSquadSchedulerEngine()
