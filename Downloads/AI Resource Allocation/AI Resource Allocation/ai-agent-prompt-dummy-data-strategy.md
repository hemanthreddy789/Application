# AI Agent Prompt: Comprehensive Dummy Data Generation Strategy

> **Companion document to the Production Transformation Prompt.** Use this to build a rich, realistic test dataset that covers every real-world scenario your platform must handle before live integrations are available.

> Give this entire document to your AI coding agent alongside (or after) Phase 1 of the main prompt.

---

## 🎯 PURPOSE

You do not yet have access to real customer data (Jira, Slack, HRIS, calendars). Your job is to generate **dummy data that is so realistic and scenario-rich** that:

1. Every ML model, scoring weight, and forecast can be validated against ground truth
2. Every edge case a real customer will throw at the system is already represented
3. UI screens look populated and convincing in demos to investors and pilot customers
4. Integration mocks can replay this data as if it came from real Jira / Slack / Workday APIs
5. Stress tests can run at realistic scale (1000+ employees, 10K+ tasks)

**Treat dummy data generation as a first-class engineering deliverable, not a throwaway script.** It will live in the codebase indefinitely, ship with the product as demo mode, and serve as the foundation of your automated test suite.

---

## 📐 CORE PRINCIPLES

1. **Realistic distributions, not uniform random.** Real teams are skewed: ~10% staff/senior, ~40% mid-level, ~50% junior-to-early. Project sizes follow a Pareto distribution. Most tasks are 2-8 hours; a few are 80+. Skill counts per employee follow a log-normal curve.

2. **Time-distributed data.** Generate data spread across the past 18 months and the next 6 months — not all "today." Historical data feeds ML training; future data feeds forecasting.

3. **Intentional messiness.** Real data has typos ("Node.js" vs "NodeJS" vs "node js"), inconsistent capitalization, abandoned tasks, employees who left, projects that died. Include 5-10% messy records to test robustness.

4. **Causal coherence.** Don't generate independent random rows. A burned-out employee should also have late deliveries. A new hire should have low historical data. A high-performing employee should have positive override patterns. **Stories, not noise.**

5. **Persona-driven generation.** Define ~20 employee personas and ~10 project archetypes; generate variations from these. Easier to reason about, easier to test against.

6. **Deterministic seeding.** Every generation run must accept a `--seed` parameter. Same seed → identical dataset. Critical for reproducible bug reports and tests.

7. **Idempotent and resettable.** Provide commands to wipe and regenerate. Provide commands to incrementally add scenarios without losing existing data.

8. **Production-safe.** Demo/dummy data must be clearly tagged (`is_demo: true`, names from a clearly fictional pool). Never accidentally show up in real tenant data.

---

## 🏢 TENANT SCENARIOS (Generate All Three)

Create **3 distinct tenant profiles** representing different customer types:

### Tenant 1: "NimbusStart" — Early-Stage Startup
- **Size:** 12 employees
- **Locations:** Single office (San Francisco)
- **Roles:** 8 engineers (full-stack-leaning), 2 PMs, 1 designer, 1 founder/CEO
- **Projects:** 3 active (1 customer-facing MVP, 1 infra migration, 1 sales enablement)
- **Maturity:** Few historical tasks, weak performance signal, cold-start scenario
- **Purpose:** Tests cold-start logic, sparse data handling, small-team edge cases

### Tenant 2: "Meridian Health" — Mid-Size Enterprise
- **Size:** 145 employees across 8 teams
- **Locations:** 3 offices (Boston, Austin, Dublin) + 40 remote
- **Roles:** Mix of engineering, PM, design, QA, DevOps, data, technical writing
- **Projects:** 22 active across teams, with cross-team dependencies
- **Maturity:** 18 months of rich historical data, established performance signals
- **Purpose:** Tests cross-team coordination, time-zone handling, mature ML scenario

### Tenant 3: "Globex Industries" — Large Enterprise
- **Size:** 850 employees across 25 teams
- **Locations:** 12 offices worldwide including Tel Aviv (Sun-Thu work week), Dubai, Bangalore, Tokyo, São Paulo, plus 200+ remote
- **Roles:** Full taxonomy including specialists (DBAs, security engineers, mobile devs, ML engineers, SREs)
- **Projects:** 80+ active, multi-quarter, with portfolio-level dependencies
- **Maturity:** 24 months of historical data, contains 4 already-completed projects
- **Purpose:** Tests scale, time-zone coverage, work-week diversity, performance budgets, bus factor at scale

---

## 👥 EMPLOYEE GENERATION

### Required Personas (Each Tenant Must Include All Where Applicable)

Generate at least one employee for each of these 25 personas. Vary names, locations, and details, but the **behavior pattern** must be present:

| # | Persona | Key Characteristics |
|---|---------|---------------------|
| 1 | **The Rockstar** | High performance, frequently recommended, 95%+ utilization, burnout-risk-high |
| 2 | **The Quiet Expert** | Sole owner of a niche skill (Kafka, Postgres internals); bus factor = 1 |
| 3 | **The Steady Senior** | Mid-high performance, healthy utilization, mentors others |
| 4 | **The New Hire (Day 5)** | Joined this week, no history, all skills self-declared with low confidence |
| 5 | **The New Hire (Day 45)** | In probation period, some completed tasks, building track record |
| 6 | **The Returner** | Just back from 9-month parental leave, ramping back up |
| 7 | **The Soon-to-Leave** | 2 weeks notice given, ramp-down period, knowledge transfer in progress |
| 8 | **The Underperformer** | On PIP, reduced workload, requires careful assignment |
| 9 | **The Generalist** | 15+ skills, none deep; good for unblocking, weak for specialization |
| 10 | **The Specialist** | 2-3 deep skills, declines everything else |
| 11 | **The Part-Timer** | 24 hours/week, Mon-Wed only (parent of young child) |
| 12 | **The Contractor** | Fixed-term, higher cost rate, no PTO, end-date in 4 months |
| 13 | **The Intern** | 90-day appointment, low capacity, paired with a mentor |
| 14 | **The Cross-Timezone Engineer** | 11-hour time-zone offset from team; reduced effective collaboration time |
| 15 | **The On-Call Lead** | This week on PagerDuty rotation; effective capacity reduced 30% |
| 16 | **The Heavy Reviewer** | 12+ open PR reviews; invisible work load high |
| 17 | **The Skill-Stale Engineer** | Has React listed but last used 18 months ago — should be decay-penalized |
| 18 | **The Manager-Coder** | 70% management overhead, 30% IC work |
| 19 | **The Designer** | Different skill taxonomy (Figma, design systems), different task types |
| 20 | **The QA Specialist** | Pairs with devs; downstream-blocked when devs run late |
| 21 | **The DevOps/SRE** | Carries on-call burden, infra projects only |
| 22 | **The Data Scientist** | Project-based, longer task durations (weeks), distinct skill set |
| 23 | **The Recent Promotion** | New manager skills, transitioning role, capacity halved |
| 24 | **The Remote-Different-Country** | Different public holidays, language preference settings |
| 25 | **The Sabbatical-Returner** | Returning from 3-month sabbatical in 2 weeks, slot upcoming work |

### Employee Field Specification

Every generated employee must have:

```yaml
id: UUID
tenant_id: UUID
first_name, last_name: From culturally diverse name pool (not just Anglo)
email: firstname.lastname@<tenant-domain>.demo
employment_type: [FTE, Contractor, Intern, PartTime]
role: [BackendEng, FrontendEng, FullStackEng, MobileEng, DevOps, SRE, QA, Designer, PM, DataScientist, MLEng, TechWriter, EngManager, Security, DBA]
seniority: [Intern, Junior, Mid, Senior, Staff, Principal, Manager, Director]
hire_date: Distributed across last 8 years, weighted toward last 2
manager_id: Form a realistic hierarchy (1 manager per 5-8 ICs)
office_location: From the tenant's office list (or "Remote")
timezone: IANA timezone matching location
work_week: Default Mon-Fri; for Israel/UAE personas, Sun-Thu
weekly_hours: 40 default, 24-32 for part-timers, 30 for interns
cost_rate_usd_hourly: Realistic range by role+seniority+location
                     (e.g., Junior FE Bangalore: $25; Staff BE SF: $180; Intern: $20)
skills: List of {skill_name, declared_level (1-5), last_used_date, verified}
preferences: {preferred_task_types: [...], avoided_task_types: [...]}
growth_goals: [list of skills employee wants to develop]
status: [Active, Probation, PIP, ParentalLeave, Sabbatical, NoticeGiven, Terminated]
mfa_enabled: Boolean (60% true)
last_login: Realistic distribution
```

### Distribution Targets

For NimbusStart (12 emp):
- 1 Manager, 1 New Hire, 1 Quiet Expert, 1 Rockstar, 1 Generalist, 1 Specialist, the rest mid-level steady

For Meridian Health (145 emp):
- 12 managers (1 per team of ~12), 8 new hires across last 3 months, 3 on parental leave, 2 on PIP, 1 contractor, 2 part-timers, 1 returning from leave, 1 with notice given, the rest distributed across all personas
- Skills distribution: each engineer has 4-12 skills (log-normal); cluster around React, Node, Python, Postgres, AWS for realism, but include 8-12 rare skills held by only 1-2 people each (bus factor test)

For Globex Industries (850 emp):
- Full hierarchy, all 25 personas represented multiple times
- ~30 employees with skills last used >12 months ago (decay test)
- ~50 employees on various leave types
- ~15 in probation
- 5 on PIP
- 8 with notice given
- 20 contractors (different end dates clustering at quarter-ends)
- Geographic spread covering all 12 offices

### Name Generation

- Use a culturally diverse name pool: Western, East Asian, South Asian, Middle Eastern, Latin American, African, Eastern European
- Use a fictional-but-plausible domain: `@nimbusstart.demo`, `@meridian-health.demo`, `@globex.demo`
- Avoid real company names or real people's names
- Tag every name with `is_demo: true`

---

## 🎓 SKILL TAXONOMY

Build a realistic, hierarchical skill taxonomy. Do not just list random tech words.

### Required Skill Categories

```yaml
Languages:
  - JavaScript, TypeScript, Python, Go, Rust, Java, Kotlin, Swift, Ruby, PHP, C#, C++

Frontend:
  - React, Vue.js, Angular, Svelte, Next.js, Nuxt, HTML/CSS, Tailwind CSS,
    SASS, Webpack, Vite, React Native, Flutter

Backend:
  - Node.js, Express, NestJS, Django, FastAPI, Flask, Spring Boot, Rails,
    Laravel, gRPC, GraphQL, REST API design

Databases:
  - PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, Cassandra, DynamoDB,
    Snowflake, BigQuery, ClickHouse, pgvector

Infrastructure:
  - AWS, GCP, Azure, Kubernetes, Docker, Terraform, Ansible, Helm,
    GitHub Actions, GitLab CI, Jenkins, ArgoCD

Data/ML:
  - Pandas, NumPy, scikit-learn, TensorFlow, PyTorch, Spark, Airflow,
    dbt, LangChain, Vector DBs, MLOps, Feature stores

Specialized:
  - Kafka, RabbitMQ, WebRTC, WebSockets, OAuth/OIDC, SAML, Stripe,
    Twilio, FFmpeg, OpenCV, CUDA

Design:
  - Figma, Sketch, Adobe XD, Design Systems, User Research, Prototyping,
    Accessibility (WCAG)

Soft Skills (separate category):
  - Technical Leadership, Cross-team Communication, Mentorship, Public Speaking,
    Customer Empathy, Technical Writing
```

### Skill Variations (Intentional Messiness)

Include these typo/variation pairs to test embedding-based matching:
- `Node.js` / `NodeJS` / `node js` / `Node`
- `React` / `ReactJS` / `React.js` / `React 18`
- `Postgres` / `PostgreSQL` / `psql`
- `K8s` / `Kubernetes` / `kube`
- `JS` / `JavaScript` / `Javascript`
- `TS` / `TypeScript` / `Typescript`

The embedding-based matcher (from Phase 2 of main spec) should treat these as equivalent.

---

## 📋 PROJECT & TASK GENERATION

### Project Archetypes

Generate at least 2 of each archetype per tenant (scaled appropriately):

| Archetype | Characteristics |
|-----------|-----------------|
| **Greenfield MVP** | New product, ambiguous requirements, exploration tasks |
| **Customer Bug Sprint** | Many small tasks, short deadlines, customer-attributed |
| **Infrastructure Migration** | Long-running, dependency-heavy, specialist-required |
| **Compliance Initiative** | Hard regulatory deadline, multi-team coordination (SOC2, GDPR) |
| **Performance Optimization** | Discovery-heavy, hard to estimate, specialist-required |
| **Mobile App Launch** | Cross-functional, dependency chains, asset coordination |
| **API V2 Rollout** | Breaking changes, versioning, deprecation timeline |
| **ML Model Development** | Long iteration cycles, data-dependent, research-flavored |
| **Stuck/At-Risk Project** | Behind schedule, key person dependency, high override rate |
| **Successful Recently-Completed** | Historical data for ML training; positive feedback loop |

### Task Field Specification

```yaml
id: UUID
tenant_id: UUID
project_id: UUID
title: Realistic engineering task title
description: 2-5 sentence description with embedded skill keywords
required_skills: List of {skill, importance_weight}
priority: [P0_critical, P1_high, P2_medium, P3_low]
estimated_hours: Pareto-distributed (most 4-16h, some 40-200h)
actual_hours: For completed tasks, vary ±30% from estimate (with bias toward over)
status: [Backlog, Ready, InProgress, Blocked, Review, Done, Cancelled]
assigned_to: UUID (null for unassigned)
created_by: UUID
created_at: Distributed across last 18 months
deadline: Variety of tight (< 7 days), normal (1-4 weeks), loose (1-3 months)
blocks_task_ids: [UUIDs of tasks this blocks]
blocked_by_task_ids: [UUIDs of tasks blocking this]
tech_stack_required: [list of techs]
domain: e.g., "payments", "authentication", "search", "billing", "infra"
ai_recommended_employee_id: UUID (for tasks where AI was consulted)
final_assignee_id: UUID (for tasks that were assigned)
was_override: Boolean (did manager pick someone different from AI?)
override_reason: enum + free text (when was_override = true)
completion_quality_score: 1-5 (for completed tasks; ML training signal)
on_time_delivered: Boolean (for completed tasks)
days_late: Integer (negative for early, 0 for on-time, positive for late)
```

### Task Volume Distribution

For Meridian Health (145 employees, target ~10K total tasks across history):
- **Backlog:** 200-300 unassigned tasks waiting for assignment
- **In-progress:** 400-500 active tasks
- **Completed (last 90 days):** ~1500 — primary ML training data
- **Completed (90 days to 18 months ago):** ~7500 — long-tail history
- **Cancelled:** ~5% of total
- **Blocked:** ~8% of in-progress tasks (these create chains)

### Critical Distributions to Get Right

- **Override rate:** Make it ~25% globally, but with patterns:
  - Manager Alice overrides toward growth opportunities (picks junior over expert) 40% of the time
  - Manager Bob overrides for political reasons (favors his direct reports) — bias detection should flag this
  - Some managers never override (high AI trust)
- **Completion quality:** Mean 3.8 / 5, std dev 0.7, but clustered by employee performance pattern
- **On-time delivery:** 70% on-time, 20% late, 10% early — but employee-correlated (rockstar 95% on-time; underperformer 40%)
- **Task complexity ↔ assignee seniority correlation:** Higher-complexity tasks predominantly went to senior employees historically (creates the training signal)

---

## 🏖️ LEAVE & HOLIDAY DATA

### Leave Records Per Tenant

Generate enough variety to stress every leave type:

- **Approved vacations:** 30-40% of employees have at least one upcoming vacation in next 60 days. Include some clustering (school holidays, December).
- **Pending vacation requests:** A handful, to test approval workflows.
- **Retroactive sick leave:** 10-15 events in past 30 days.
- **Parental leave (active):** 2-4 employees per tenant currently on parental leave (3-12 month range, varied start dates).
- **Sabbatical:** 1 employee currently on sabbatical, 1 returning in 2 weeks.
- **Bereavement:** 2-3 short events in past 90 days.
- **Jury duty:** 1 active or upcoming.
- **PIP-related reduced hours:** 1-2 employees on reduced schedules.
- **Long weekends:** Some employees take Fridays before holidays.

### Holiday Calendars

Pre-populate regional holiday calendars for all locations:

```yaml
locations_and_holiday_sets:
  US:
    - New Year, MLK Day, Presidents Day, Memorial Day, Juneteenth, Independence Day,
      Labor Day, Thanksgiving + day after, Christmas Eve, Christmas, NYE
  India (Bangalore):
    - Republic Day, Holi, Good Friday, Independence Day, Gandhi Jayanti, Diwali,
      Christmas + regional Karnataka holidays
  Israel (Tel Aviv):
    - Rosh Hashanah, Yom Kippur, Sukkot, Passover, Independence Day,
      Shavuot — note Sun-Thu work week
  UAE (Dubai):
    - Eid al-Fitr, Eid al-Adha, UAE National Day, Islamic New Year — Sun-Thu work week
  Ireland (Dublin):
    - St. Patrick's Day, Easter Monday, May Day, June bank holiday,
      August bank holiday, Christmas, St. Stephen's Day
  Japan (Tokyo):
    - Coming of Age, National Foundation Day, Showa Day, Constitution Day,
      Children's Day, Marine Day, Mountain Day, Respect for Aged Day,
      Sports Day, Culture Day, Labor Thanksgiving, Emperor's Birthday
  Brazil (São Paulo):
    - Carnival (multi-day), Tiradentes, Independence Day, Our Lady of Aparecida,
      All Souls, Proclamation of Republic
  UK:
    - Bank holidays, Christmas, Boxing Day
```

Holidays must drive the forecaster — an employee in Dubai is unavailable on Eid even if available everywhere else.

### Religious & Cultural Considerations

- Mark some employees as observing Ramadan (reduced effective hours during the month)
- Mark some as observing Jewish holidays
- Mark some as observing Hindu festivals (Diwali week off in many cases)
- Provide an opt-in field; never assume based on name or location

---

## 📊 HISTORICAL FEEDBACK & ML TRAINING DATA

This is the most critical dataset — it trains your adaptive scorer.

### Feedback Event Generation

For Meridian Health, generate ~2000 feedback events across 18 months:

```yaml
feedback_event:
  id: UUID
  task_id: UUID (links to completed/assigned task)
  ai_recommendations: List of top 5 candidates with scores
  manager_choice: UUID (the one chosen)
  was_top_pick: Boolean
  override_reason: enum (if not top pick)
  override_reason_text: free-text (optional)
  decision_timestamp: timestamp
  outcome_quality: Final quality score of the task (joins back later)
  outcome_on_time: Boolean
```

### Patterns to Encode

The dummy data must contain learnable patterns the ML model should discover:

1. **Skill match dominance:** Top picks are taken 75% of the time when skill match > 90%
2. **Capacity sensitivity:** When top pick is at >120% utilization, override rate jumps to 60%
3. **Growth bias by Manager Alice:** She overrides toward juniors with growth goals 40% of the time on P3 (low priority) tasks
4. **Domain loyalty:** When a task is in a domain with a clear expert, that expert is picked 90%+ regardless of utilization (this is the burnout-creating pattern your platform should flag)
5. **Deadline urgency:** P0 tasks always go to top-scored available employee regardless of growth considerations
6. **New hire shielding:** Junior employees in probation receive few P0 task assignments, mostly P2/P3

If your retrained model **doesn't** discover these patterns, your ML pipeline is broken.

---

## 🚨 EDGE CASES THAT MUST BE PRESENT

These are the scenarios that real customers will throw at the system on day one. **Ensure each is represented in at least one tenant's data:**

1. ✅ **Task with no qualifying assignee** — all skill-matched employees on leave or overloaded
2. ✅ **Two employees with identical scores** — tie-breaking logic must be deterministic
3. ✅ **Task with skills nobody on the team has** — should suggest external hire or training need
4. ✅ **Employee with zero skills declared** — shouldn't crash; should show as cold-start
5. ✅ **Project with circular dependency** — task A blocks B blocks A — must detect and warn
6. ✅ **Employee whose manager left** — orphaned reportee; needs reassignment
7. ✅ **Tasks with deadlines in the past** — overdue, should surface differently
8. ✅ **Task created by user who was terminated** — must not break the audit trail
9. ✅ **Employee in time zone that makes overlap with team < 2 hours** — collaboration penalty
10. ✅ **Task requiring 3 separate people simultaneously** — team-recommendation case
11. ✅ **Leave spanning year boundary** (Dec 20 – Jan 5) — date math edge case
12. ✅ **Public holiday landing on weekend** — work week impact
13. ✅ **Employee with skills predating their hire date** (declared from prior job) — valid case
14. ✅ **Tenant with only 3 employees** — small-team UI doesn't break
15. ✅ **Skill listed twice on same employee with different levels** — data cleanup case
16. ✅ **Employee with `last_login` > 6 months ago** — likely terminated but not marked
17. ✅ **Task estimated 4 hours but assignee took 60** — outlier for ML to handle
18. ✅ **Manager assigning task to themselves** — valid but special case
19. ✅ **Cross-tenant data isolation** — ensure no query ever returns Tenant A data when scoped to Tenant B
20. ✅ **Concurrent edits to same task** — last-write-wins or merge — define behavior
21. ✅ **Employee marked as on parental leave but with active task assignments** — data inconsistency to flag
22. ✅ **Project with 200+ tasks** — UI pagination, performance
23. ✅ **Task assigned to employee with notice given expiring before deadline** — must warn
24. ✅ **Employee on PIP who is the only domain expert** — sensitive scenario, surface carefully
25. ✅ **Holiday calendar disagreement** (employee in Dubai works for SF team) — whose holidays count?

---

## 🛠️ IMPLEMENTATION REQUIREMENTS

### Tech Stack for Seeding

- **Node side (Prisma):** Use `@faker-js/faker` with seeded random
- **Python side:** Use `Faker` library with seeded random
- **Coordination:** Generate UUIDs in one place (Node) and pass to Python service via API or shared seed file
- **Storage:** Output seed data as both:
  - JSON fixtures in `/seeds/fixtures/` (version-controlled, reviewable)
  - Direct DB inserts via Prisma seed script

### Required Commands

Implement these CLI commands:

```bash
# Generate fresh dummy data for all 3 tenants
npm run seed:all -- --seed=42

# Generate just one tenant
npm run seed:tenant -- --name=meridian --seed=42

# Wipe demo data (preserves real customer data)
npm run seed:reset

# Generate "stress test" dataset (5000 employees, 50K tasks)
npm run seed:stress -- --seed=42

# Replay historical events as if happening in real-time (for demos)
npm run seed:replay -- --speed=10x

# Generate just the edge case scenarios (for test suites)
npm run seed:edge-cases
```

### Mock Integration Layer

Since real integrations aren't available, build a **mock integration server** that responds like the real APIs would:

- `/mocks/jira/` — Returns Jira-shaped responses with our dummy task data
- `/mocks/slack/` — Logs sent notifications instead of actually sending
- `/mocks/calendar/` — Returns calendar events derived from our task assignments
- `/mocks/hris/` — Returns BambooHR-shaped employee data

When real integrations come online later, swap the mock URLs for real ones — application code shouldn't need to change.

### Validation After Generation

After every seed run, automatically validate:

- All foreign keys resolve
- No orphaned records
- All employees have a `tenant_id` and `manager_id` (except top-level managers)
- All tasks have valid `created_by` and (if assigned) `assigned_to`
- Date math: no deadlines before creation date, no leaves before hire date
- Every edge case from the list above is present and queryable

Output a validation report:

```
Seeding complete:
✓ 3 tenants created
✓ 1,007 employees (12 + 145 + 850)
✓ 14,234 tasks across 105 projects
✓ 2,891 feedback events
✓ 1,456 leave records
✓ 25 distinct personas represented
✓ 25/25 edge cases present
✓ All foreign keys valid
✓ Cross-tenant isolation verified
```

---

## 📦 DELIVERABLES

You must produce:

1. `/seeds/personas.yaml` — Definitions of all 25 personas
2. `/seeds/skill-taxonomy.yaml` — Full skill list with categories
3. `/seeds/holiday-calendars.yaml` — Per-region holiday data
4. `/seeds/project-archetypes.yaml` — Project templates
5. `/seeds/generators/` — Node + Python generator modules
6. `/seeds/fixtures/` — Generated JSON fixtures (committed for reproducibility)
7. `/seeds/edge-cases/` — Specific edge case scenarios as fixtures
8. `/mocks/` — Mock integration servers for Jira, Slack, Calendar, HRIS
9. `/docs/dummy-data.md` — How to regenerate, modify, extend
10. `tests/dataset-validation.test.ts` — Test suite verifying all edge cases present

---

## ✅ ACCEPTANCE CRITERIA

This phase is complete only when:

- [ ] All 3 tenants seed without errors using `npm run seed:all`
- [ ] All 25 personas represented in Meridian Health and Globex
- [ ] All 25 edge cases queryable and present
- [ ] Forecasting works correctly across all time zones and work-week variants
- [ ] ML training on seeded historical data converges to weights that approximate the intentionally-encoded patterns
- [ ] UI screens look populated and convincing — no empty states except where intentional
- [ ] Mock integrations return data shaped like real Jira / Slack / Workday APIs
- [ ] A demo can run end-to-end on dummy data alone, demonstrating every Phase 1-3 feature
- [ ] Resetting and re-seeding is fast (< 60 seconds for full small tenant, < 5 minutes for Globex)
- [ ] Stress test dataset (5000 employees) generates and the platform handles it within performance budgets

---

## 🎯 EXECUTION GUIDANCE

1. **Start with the personas YAML.** Get the human review on 25 persona definitions before coding generators.
2. **Build small tenant (NimbusStart) first.** Validate the whole pipeline at 12 employees before scaling.
3. **Wire up the edge case checker early.** Run it after every change to catch regressions.
4. **Generate ML training data last.** It depends on completed tasks, which depend on employees and projects.
5. **Treat fixtures as reviewable artifacts.** Commit them. Diff them. Edge case YAML files should be hand-editable.
6. **Don't over-randomize.** Use the seed parameter so the same input produces identical output. Reproducibility matters more than novelty.
7. **Demo data is a product feature, not a dev tool.** Pilot customers will see this. Polish it.

---

## 📌 WHEN REAL INTEGRATIONS COME ONLINE

Design the seed system so swapping to real data is trivial:

- Every integration is behind an interface (`IssueTracker`, `Calendar`, `HRSystem`)
- Mock implementations and real implementations satisfy the same interface
- Feature flag per tenant: `data_source: mock | real`
- A "shadow mode" where real data flows in but the system also retains demo data for comparison

This means you'll never have to throw away the dummy data work — it becomes your test fixtures, your demo environment, and your training data scaffolding forever.

**Begin with the personas YAML. Confirm scope with the human, then proceed.**
