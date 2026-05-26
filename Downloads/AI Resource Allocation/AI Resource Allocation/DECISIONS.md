# Architectural Decisions Log

## Phase 1: Foundation Hardening

### DECISION 1.1: Database Engine & Schema Modernization
* **Date**: 2026-05-14
* **Context**: Transitioning from SQLite prototype to Enterprise PostgreSQL.
* **Decision**: Adopt PostgreSQL 15+ with UUID primary keys, multi-tenant foreign keys (`tenant_id`), and robust audit logging columns (`created_at`, `updated_at`, `created_by`, `updated_by`, `deleted_at`).
* **Rationale**: Required to support multi-tenancy, enterprise auditability, soft-deletion workflows, and high-concurrency connection pooling without database locking.

### DECISION 1.2: Authentication, RBAC & Multi-Tenant Isolation Middleware
* **Date**: 2026-05-14
* **Context**: Protecting tenant boundaries and implementing least-privilege security.
* **Decision**: Implement JWT access (15m) / refresh (7d) token exchange with mandatory tenant context (`req.tenantId`). Enforce 5-tier Role-Based Access Control (`super_admin`, `tenant_admin`, `manager`, `employee`, `viewer`) and IP-based rate limiting on all authentication routes.
* **Rationale**: Guarantees strict cryptographic tenant isolation across all API endpoints while preventing brute-force dictionary attacks.

### DECISION 1.3: Containerized Infrastructure, Kubernetes & Graceful Lifecycle Management
* **Date**: 2026-05-14
* **Context**: Designing for high availability, zero-downtime rolling deployments, and container orchestration.
* **Decision**: Adopt multi-stage Docker builds across Frontend (Nginx SPA), Backend (Node 18), and ML Service (Python 3.10). Deploy via Kubernetes manifests (`/k8s`) with HorizontalPodAutoscaler (HPA) CPU-based scaling. Mandate `/health` (liveness) and `/health/ready` (readiness) checking database and Redis connection state alongside SIGTERM graceful shutdown handlers.
* **Rationale**: Eliminates zombie connection leaks, prevents cascading service failures during pod restarts, and ensures horizontal autoscaling under peak enterprise load.

### DECISION 1.4: Multi-Tier Caching Layer & Resilient Background Workers
* **Date**: 2026-05-14
* **Context**: Achieving sub-200ms P95 API response times and decoupling heavy computational workloads.
* **Decision**: Implement Redis caching for scoring results (300s TTL with event-driven invalidation), session management (86400s TTL), and tenant configurations. Decouple ML retraining, 4h forecast precomputation, and audit archiving using BullMQ (Node) and Celery (Python) background task queues configured with exponential backoff retries and Dead-Letter Queue (DLQ) logging.
* **Rationale**: Prevents API gateway timeouts during deep ML inference, shields database read replicas from repetitive scoring queries, and guarantees robust failure recovery for asynchronous system tasks.

### DECISION 1.5: Unified Observability Engine, OpenTelemetry & Prometheus Metrics
* **Date**: 2026-05-14
* **Context**: Ensuring deep operational explainability and auditing across distributed microservices.
* **Decision**: Implement Pino (Node) and Structlog (Python) structured JSON logging enforcing mandatory request context (`request_id`, `user_id`, `tenant_id`, `service`). Enable OpenTelemetry distributed tracing across HTTP boundaries alongside dedicated Prometheus `/metrics` scrapers and `/admin/system-health` monitoring dashboards.
* **Rationale**: Enables instant distributed root-cause debugging across complex microservice boundaries while providing SREs with real-time operational visibility into queue depths, database latency, and ML inference performance.

### DECISION 1.6: API Standards, Response Envelopes, Zod Validation & OpenAPI 3.0
* **Date**: 2026-05-14
* **Context**: Enforcing strict client-server API contract consistency and input security.
* **Decision**: Standardize all API responses into a predictable JSON envelope (`success`, `data`, `error`, `meta`). Reject malformed payloads instantly at the routing layer using Zod schema validation. Serve auto-generated OpenAPI 3.0 documentation via Swagger UI at `/api/docs` while rate-limiting read operations (100 req/min) and write operations (30 req/min).
* **Rationale**: Guarantees zero unhandled exceptions reach clients, prevents injection attacks before business logic executes, and provides third-party integrators with an interactive, production-ready developer portal.

### DECISION 2.1: Configurable Scoring, Learning-to-Rank LightGBM & Sentence-Transformer Embeddings
* **Date**: 2026-05-14
* **Context**: Eliminating arbitrary scoring heuristics and exact-string matching fragility.
* **Decision**: Expose configurable tenant scoring weight tables at `/api/scoring-config` with live 'What-If' previewing. Replace linear regression with a LightGBM LambdaMART Learning-to-Rank engine evaluating 9 pairwise ranking features. Use Sentence-Transformers (`all-MiniLM-L6-v2`) to calculate semantic cosine similarity (fixing `React` vs `ReactJS`). Introduce Epsilon-greedy exploration (15% stretch candidates), Bus Factor <= 1 warnings, Cold Start onboarding shielding, and Context Switching penalties (`concurrent_projects * 5%`).
* **Rationale**: Ensures the AI ranks employees based on true enterprise suitability while proactively mitigating single-point-of-failure skill silos and preventing developer burnout.

### DECISION 3.1: AI Explainability Panels, Employee Self-View, Decision Auditing & Bias Detection
* **Date**: 2026-05-14
* **Context**: Achieving absolute regulatory auditability, transparency, and employee trust in AI decisions.
* **Decision**: Implement `/explain` endpoints generating factor breakdowns, top 3 plain English reasons, risk concerns, and side-by-side candidate comparisons. Expose `/api/me` employee self-view dashboards featuring 28-day workload forecasts and 'Flag Overload' alerting. Mandate structured override logging (`skill match`, `growth opportunity`, `team chemistry`) exportable to CSV at `/api/audit/export`. Deploy monthly demographic bias and fairness reporting (`/api/reports/bias-detection`) tracking disparate impact ratios across gender, age, and tenure.
* **Rationale**: Eliminates 'black-box' AI skepticism, empowers individual contributors to manage their capacity, and provides HR/Legal compliance teams with robust, exportable defense records.

### DECISION 4.1: Real-World Scenarios, Squad Staffing, Invisible Work, CPM Critical Paths & Budgeting
* **Date**: 2026-05-14
* **Context**: Adapting resource allocation algorithms to messy enterprise staffing realities.
* **Decision**: Implement `/api/scenarios/squad-recommendation` to staff multi-role squads covering collective skill requirements. Factor invisible overhead work (pager rotation 20%, mentoring 10%, interviewing 15%) and pending leave probabilities (50% reduction) into net capacity calculations. Traverse project dependency graphs using the Critical Path Method (CPM) to flag downstream delay risks on bottleneck tasks. Enforce cross-department borrowing workflows and real-time project budget variance tracking (`projected_cost > budget`).
* **Rationale**: Ensures the AI plans around real-world constraints (contractor costs, invisible mentoring overheads, pending time off, and multi-role squad dynamics) rather than naive single-assignee assumptions.

### DECISION 5.1: Enterprise Integration Ecosystem, Webhooks & Automated Sync Pipelines
* **Date**: 2026-05-14
* **Context**: Eliminating data silos by connecting resource planning directly to core engineering tooling.
* **Decision**: Establish an abstract `IntegrationPlugin` framework supporting concrete adapters for Jira, Google Workspace / M365 calendars, Slack, Workday HRIS, and GitHub. Implement webhook listeners (`/webhooks/jira`) for instant cache invalidation upon task status transitions, scheduled nightly HRIS roster ingestion, meeting density capacity reductions (>20h/week), and Git commit monitoring (flagging stalled assignments with 0 commits in 14 days).
* **Rationale**: Prevents staffing models from drifting out of sync with actual engineering reality while automating administrative roster maintenance and proactive delivery tracking.

### DECISION 6.1: State-of-the-Art Workforce Planning, What-If Simulations, Burnout Risk & Real-Time Collaboration
* **Date**: 2026-05-14
* **Context**: Transforming resource allocation from reactive administrative tracking into proactive executive intelligence.
* **Decision**: Implement `/api/advanced/scenario-planning` What-If simulation modeling (`WIN_PROJECT_X`, `BOB_QUITS`, `HIRE_CONTRACTORS`) with workload forecast diffs. Calculate organization-wide skill gap analyses identifying quarter-over-quarter skill deficits alongside composite Burnout Risk Indexes (0-100) flagging mandatory PTO interventions. Deploy Server-Sent Events (SSE) streaming at `/api/realtime/stream` for live cross-manager assignment collaboration, PWA mobile-responsive manifests (`manifest.json`), and C-level executive summary / finance billing CSV exports.
* **Rationale**: Empowers engineering leadership to simulate strategic hiring decisions, proactively eliminate employee burnout before resignation events occur, and collaborate synchronously across distributed management teams.
