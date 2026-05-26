import json
import re
from datetime import datetime, timedelta

class TaskIntelligence:
    def __init__(self):
        # In a production environment, you would initialize Anthropic/Claude client here.
        # e.g., self.client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        pass

    def parse_task_description(self, description: str):
        """
        Uses an LLM (Mocked for MVP) to extract structured data from unstructured text.
        """
        desc_lower = description.lower()
        
        # --- Mock LLM Extraction Logic ---
        title = "New Task"
        if len(description) > 5:
            # Use first 30 chars as title roughly
            title = description[:30].split('.')[0].strip()
            
        task_type = "Development"
        if "design" in desc_lower or "ui" in desc_lower or "figma" in desc_lower:
            task_type = "Design"
        elif "test" in desc_lower or "qa" in desc_lower:
            task_type = "Testing"
        
        complexity = "Medium"
        if "complex" in desc_lower or "hard" in desc_lower or "critical" in desc_lower:
            complexity = "High"
        elif "simple" in desc_lower or "easy" in desc_lower or "quick" in desc_lower:
            complexity = "Low"
            
        estimated_hours = 16
        hours_match = re.search(r'(\d+)\s*(hour|hr)s?', desc_lower)
        days_match = re.search(r'(\d+)\s*days?', desc_lower)
        if hours_match:
            estimated_hours = int(hours_match.group(1))
        elif days_match:
            estimated_hours = int(days_match.group(1)) * 8
        elif complexity == "High":
            estimated_hours = 40
        elif complexity == "Low":
            estimated_hours = 4

        # Extract potential skills
        skills = []
        if "api" in desc_lower or "backend" in desc_lower or "rest" in desc_lower:
            skills.extend(["Backend Development", "API Design"])
        if "react" in desc_lower or "frontend" in desc_lower:
            skills.append("React")
        if "database" in desc_lower or "sql" in desc_lower:
            skills.append("SQL")
            
        suggested_deadline = (datetime.utcnow() + timedelta(days=7)).date().isoformat()
        if "friday" in desc_lower:
            # Just mock a date
            suggested_deadline = (datetime.utcnow() + timedelta(days=3)).date().isoformat()
            
        confidence = 0.85
        clarification_needed = None
        if len(description) < 15:
            confidence = 0.4
            clarification_needed = "The description is very short. Could you provide more details on the technical requirements?"

        return {
            "title": title.title(),
            "task_type": task_type,
            "required_skills": list(set(skills)),
            "complexity": complexity,
            "estimated_hours": estimated_hours,
            "suggested_deadline": suggested_deadline,
            "confidence": confidence,
            "clarification_needed": clarification_needed
        }

    def check_skill_gap(self, required_skills: list, employees_data: list):
        """
        Cross-references required skills against the team's skill matrix.
        """
        # For MVP, we mock the gap check assuming we pass in basic employee skill lists
        missing_skills = []
        for req in required_skills:
            found = False
            for emp in employees_data:
                if req in emp.get("skills", []):
                    found = True
                    break
            if not found:
                missing_skills.append(req)
                
        if missing_skills:
            return {
                "has_gap": True,
                "missing_skills": missing_skills,
                "message": f"Skill Gap Alert: No available employee has proficiency in {', '.join(missing_skills)}.",
                "options": ["Schedule training", "Hire contractor", "Assign anyway to learn"]
            }
        
        return {
            "has_gap": False,
            "missing_skills": [],
            "message": "Team has adequate skill coverage for this task.",
            "options": []
        }
