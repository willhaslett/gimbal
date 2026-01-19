# Backend Architecture

> Official spec for Gimbal's backend infrastructure.

## Decision

**"One Good Server"** — a single App Runner service backed by Postgres and S3.

## Architecture

```
Cloudflare (DNS + SSL)
         │
         ▼
    App Runner (Node.js API)
         │
    ┌────┴────┐
    ▼         ▼
RDS Postgres  S3
(users,       (project
projects,     files)
sessions)
```

## Components

| Component | Service | Purpose |
|-----------|---------|---------|
| API | App Runner | Node.js server, handles all HTTP + SSE streaming |
| Database | RDS Postgres 16 | Users, projects, sessions, metadata |
| File Storage | S3 | Project files, versioned and encrypted |
| Secrets | Secrets Manager | API keys, DB credentials |
| DNS/SSL | Cloudflare | Routing, SSL termination, basic CDN |

## Rationale

**Why not Lambda-only:**
- Streaming (SSE) is core to Gimbal's UX — Lambda makes this awkward
- Cold starts impact perceived responsiveness
- Claude Agent SDK fits better with persistent server model

**Why not Hybrid (Lambda + App Runner) yet:**
- No current need for background/async processing
- Adds complexity without solving a real problem today
- Can add Lambda later when we have concrete use cases (YAGNI)

**Why App Runner over ECS/Fargate:**
- Simpler — no clusters, task definitions, or ALB configuration
- Auto-scaling built in
- Scales down to minimal cost when idle
- Sufficient control for our needs

**Why Postgres over DynamoDB:**
- Relational model fits naturally (users → projects → files)
- SQL is familiar — faster development
- Flexible querying for future features

## Constraints Met

| Constraint | How |
|------------|-----|
| $20/mo for 100 users | App Runner ~$5-15, RDS ~$15, S3 <$1 |
| Single dev can operate | One deployable, one log stream |
| Deploy in an afternoon | Already deployed via CDK |
| Scales to 10k users | App Runner auto-scales, RDS can be upgraded |

## Evolution Path

This architecture supports incremental additions without rewrites:

1. **Now:** App Runner + Postgres + S3
2. **When needed:** Add Lambda + SQS for background jobs (long-running research, notifications)
3. **If needed:** Add ElastiCache for caching (only if we hit performance bottlenecks)

## Configuration

### Preview/Development

| Resource | Size | Cost |
|----------|------|------|
| App Runner | 0.25 vCPU, 0.5GB RAM | ~$5-15/mo |
| RDS Postgres | t4g.micro, 20GB | ~$15/mo |
| S3 | Standard | <$1/mo |

### Production (Future)

Upgrade path when needed:
- App Runner: Increase vCPU/RAM
- RDS: t4g.small → t4g.medium, enable Multi-AZ
- Add read replicas if query load requires

## Security (Before GA)

1. **VPC Connector** — Move RDS to private subnet, App Runner connects via VPC
2. **Security groups** — Restrict Postgres to VPC Connector only
3. **Deletion protection** — Enable on RDS
4. **Backup retention** — Increase from default

## Related

- Source material: `doc_archive/architecture-brainstorm.md`, `doc_archive/infrastructure.md`
