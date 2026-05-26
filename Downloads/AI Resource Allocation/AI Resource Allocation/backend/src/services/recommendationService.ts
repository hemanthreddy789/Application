import { PrismaClient, Employee, Task } from '@prisma/client';

export async function getTopRecommendedEmployees(prisma: PrismaClient, taskId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { requiredSkills: { include: { skill: true } } }
  });

  if (!task) throw new Error('Task not found');

  const employees = await prisma.employee.findMany({
    include: { 
      skills: { include: { skill: true } },
      assignedTasks: true,
      leaves: { where: { status: 'Approved' } }
    }
  });

  const config = {
    skillMatchWeight: 0.45,
    availabilityWeight: 0.35,
    performanceWeight: 0.15,
    deadlineCompatibilityWeight: 0.05
  };

  const scoredEmployees = employees.map(emp => {
    let skillMatchScore = calculateSkillMatch(emp, task);
    const completedDomainTasks = emp.assignedTasks.filter(t => t.status === 'Completed' && t.taskType === task.taskType);
    let domainExpertBonus = 0;
    if (completedDomainTasks.length > 0) {
      domainExpertBonus = Math.min(15 + completedDomainTasks.length * 5, 30);
      skillMatchScore = Math.min(skillMatchScore + domainExpertBonus, 100);
    }
    
    // 2. Availability Score (0-100) — Hard penalize overloaded employees
    const availabilityScore = calculateAvailability(emp);
    
    // 3. Performance Score (normalized 0-100)
    const perfScore = Math.min(Math.max(emp.performanceScore, 0), 100);

    // 4. Deadline compatibility — penalize if employee has active leaves during deadline
    const deadlineScore = calculateDeadlineCompatibility(emp, task);

    // 5. Weighted final score
    let finalScore =
      (skillMatchScore * config.skillMatchWeight) +
      (availabilityScore * config.availabilityWeight) +
      (perfScore * config.performanceWeight) +
      (deadlineScore * config.deadlineCompatibilityWeight);

    // HARD PENALTY: If skill match is very low (<40), discount final score so wrong tech stack is never recommended
    let penaltyApplied = false;
    if (skillMatchScore < 40) {
      finalScore *= 0.25;
      penaltyApplied = true;
    }

    const explanation = buildExplanation(emp, skillMatchScore, availabilityScore, perfScore, deadlineScore, task);
    
    // Build Reason Summary in plain English
    const availableHours = Math.max((emp.weeklyCapacityHours || 40) - (emp.currentAllocatedHours || 0), 0);
    const reasonSummary = `${emp.name} is recommended because they have ${Math.round(skillMatchScore)}% skill match, ${availableHours} available hours this week, completed ${completedDomainTasks.length} similar ${task.taskType} tasks, and has ${deadlineScore === 0 ? 'a leave conflict' : 'no leave conflict'} before the deadline.`;

    const activeTasks = emp.assignedTasks.filter(t => t.status !== 'Completed');

    return {
      employeeId: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      skillMatchScore: Math.round(skillMatchScore),
      availabilityScore: Math.round(availabilityScore),
      performanceScore: Math.round(perfScore),
      deadlineCompatibilityScore: Math.round(deadlineScore),
      finalScore: Math.round(finalScore * 10) / 10,
      explanation,
      reasonSummary,
      domainExpertBonus,
      penaltyApplied,
      confidenceScore: Math.round((skillMatchScore + availabilityScore) / 2),
      currentAllocatedHours: emp.currentAllocatedHours,
      weeklyCapacityHours: emp.weeklyCapacityHours,
      activeTaskCount: activeTasks.length,
      upcomingLeaves: emp.leaves.map(l => ({ startDate: l.startDate, endDate: l.endDate, leaveType: l.leaveType }))
    };
  });

  scoredEmployees.sort((a, b) => b.finalScore - a.finalScore);
  return scoredEmployees; // Return all candidates so manager can override with anyone
}



function calculateSkillMatch(employee: any, task: any): number {
  // If task has required skills, check exact match
  if (task.requiredSkills && task.requiredSkills.length > 0) {
    let matchCount = 0;
    task.requiredSkills.forEach((reqSkill: any) => {
      const empSkill = employee.skills.find((es: any) => es.skill.name === reqSkill.skill.name);
      if (empSkill) {
        // Bonus for higher proficiency level
        matchCount += 0.6 + (empSkill.proficiencyLevel / 5) * 0.4;
      }
    });
    return (matchCount / task.requiredSkills.length) * 100;
  }

  // No required skills on task — use task type to role heuristics
  const roleSkillMap: Record<string, string[]> = {
    'Frontend Dev': ['Development', 'Design', 'Testing'],
    'Backend Dev': ['Development', 'Backend', 'Security', 'Analysis'],
    'Full Stack': ['Development', 'Backend', 'Testing', 'Documentation'],
    'QA Engineer': ['Testing', 'Analysis', 'Documentation'],
    'DevOps': ['DevOps', 'Security', 'Backend'],
    'Data Scientist': ['Analysis', 'Development'],
  };

  const compatibleTypes = roleSkillMap[employee.role] || [];
  const isCompatible = compatibleTypes.includes(task.taskType);
  
  // Base on proficiency of top skill
  const topSkill = employee.skills.reduce((best: any, cur: any) => 
    (cur.proficiencyLevel > (best?.proficiencyLevel || 0)) ? cur : best, null);
  
  const proficiencyBonus = topSkill ? (topSkill.proficiencyLevel / 5) * 30 : 0;
  return isCompatible ? 60 + proficiencyBonus : 30 + proficiencyBonus;
}

function calculateAvailability(employee: any): number {
  const cap = employee.weeklyCapacityHours || 50;
  const alloc = employee.currentAllocatedHours || 0;
  const utilization = alloc / cap;

  // Hard penalties for overloading
  if (utilization >= 1.5) return 0;    // Severely overloaded
  if (utilization >= 1.0) return 10;   // Overloaded
  if (utilization >= 0.85) return 30;  // High load
  if (utilization >= 0.6) return 60;   // Moderate
  if (utilization >= 0.3) return 85;   // Good availability
  return 100; // Very available
}

function calculateDeadlineCompatibility(employee: any, task: Task): number {
  const deadline = new Date(task.deadline);
  
  // Check if any leave overlaps with deadline
  const hasLeaveConflict = employee.leaves.some((leave: any) => {
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    return deadline >= start && deadline <= end;
  });

  if (hasLeaveConflict) return 0; // Hard block — on leave at deadline

  const utilization = employee.currentAllocatedHours / (employee.weeklyCapacityHours || 50);
  if (utilization > 1.0) return 20;
  return 90;
}

function buildExplanation(emp: any, skill: number, avail: number, perf: number, deadline: number, task: any): string {
  const parts: string[] = [];

  // Domain Expert
  if (emp.assignedTasks) {
    const completedDomain = emp.assignedTasks.filter((t: any) => t.status === 'Completed' && t.taskType === task.taskType);
    if (completedDomain.length > 0) {
      parts.push(`🏆 Domain Expert (${completedDomain.length} previous completed task(s) in ${task.taskType})`);
    }
  }

  // Skill match
  if (skill >= 80) parts.push(`🎯 Strong tech stack match for ${task.taskType}`);
  else if (skill >= 50) parts.push(`⚡ Partial skill match`);
  else parts.push(`❌ Tech stack mismatch (Incompatible role/skills)`);

  // Availability
  const util = Math.round((emp.currentAllocatedHours / emp.weeklyCapacityHours) * 100);
  if (avail === 0) parts.push(`⚠️ Severely overloaded (${util}% capacity used)`);
  else if (avail < 30) parts.push(`🔴 High workload (${util}% capacity, ${emp.currentAllocatedHours}h allocated)`);
  else if (avail < 70) parts.push(`🟡 Moderate workload (${util}% capacity)`);
  else parts.push(`🟢 Available — only ${util}% capacity used (${emp.currentAllocatedHours}/${emp.weeklyCapacityHours}h)`);

  // Upcoming Leaves
  if (emp.leaves && emp.leaves.length > 0) {
    const leaveStrs = emp.leaves.map((l: any) => `${l.leaveType}: ${new Date(l.startDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}–${new Date(l.endDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}`).join(', ');
    parts.push(`📅 Upcoming Leave: ${leaveStrs}`);
  }

  // Active tasks
  if (emp.assignedTasks && emp.assignedTasks.length > 0) {
    parts.push(`${emp.assignedTasks.length} active task(s)`);
  }

  // Performance
  if (perf >= 90) parts.push(`⭐ Top performer (${Math.round(perf)}% score)`);
  else if (perf >= 75) parts.push(`Good performer (${Math.round(perf)}% score)`);

  // Deadline conflict
  if (deadline === 0) parts.push(`❌ On leave during deadline`);

  return parts.join(' • ');
}


export function generateRecommendationExplanation(employee: Employee, skillMatch: number, availability: number, performance: number) {
  let reason = `${employee.name} is recommended because they have a ${Math.round(skillMatch)}% skill match`;
  if (availability > 80) reason += `, low current workload`;
  else if (availability > 40) reason += `, manageable workload`;
  else reason += `, despite a high workload`;
  reason += `, and a past performance score of ${performance}.`;
  return reason;
}
