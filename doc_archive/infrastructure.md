# Gimbal Infrastructure (AWS)

> Production infrastructure for Gimbal, deployed via AWS CDK.

**Company:** Prodaic (prodaic.com)
**Product:** Gimbal

---

## Architecture

```
Cloudflare DNS
    ├── prodaic.com → S3 (React static site)
    └── api.prodaic.com → App Runner (Node server)
                              ↓
                    RDS Postgres + S3 (project files)
```

---

## Components

| Component | Service | Details |
|-----------|---------|---------|
| Static site | S3 + Cloudflare | React app, public bucket with website hosting |
| API | App Runner | Docker container, 0.25 vCPU, 0.5GB RAM |
| Database | RDS Postgres 16 | t4g.micro, 20GB, publicly accessible (preview) |
| Project files | S3 | Versioned, encrypted |
| Secrets | Secrets Manager | Anthropic API key, DB credentials (auto-generated) |
| DNS | Cloudflare | SSL termination, CDN |

---

## Infrastructure as Code

All infrastructure is defined in `infra/` using AWS CDK (TypeScript).

```bash
cd infra

# Preview changes
npx cdk diff

# Deploy
npx cdk deploy

# Post-deployment setup (API key, client deploy, DNS instructions)
./scripts/post-deploy.sh
```

**Key files:**
- `infra/lib/infra-stack.ts` — Main stack definition
- `infra/scripts/post-deploy.sh` — Post-deployment automation
- `packages/server/Dockerfile` — Server container image

---

## Security Hardening (Before GA)

Comments in `infra-stack.ts` mark security improvements needed before GA:

1. **VPC Connector** — Move RDS to private subnet, add VPC Connector for App Runner (~$30/mo)
2. **Security group** — Restrict Postgres access to VPC Connector only (currently open to internet)
3. **Deletion protection** — Enable on RDS
4. **CloudFront** — Add CDN in front of S3 for better performance (optional)

---

## Deployment Commands

```bash
# Full deploy (first time or infra changes)
cd infra && npx cdk deploy

# Client-only deploy (after client code changes)
cd packages/client
VITE_API_URL="https://api.prodaic.com" pnpm build
aws s3 sync dist/ s3://prodaic-site-ACCOUNT_ID/ --delete

# Server-only deploy (after server code changes)
cd infra && npx cdk deploy  # Rebuilds and pushes Docker image
```

---

## Secrets Management

```bash
# Set Anthropic API key
aws secretsmanager put-secret-value \
    --secret-id prodaic/anthropic-api-key \
    --secret-string "sk-ant-..."

# Get DB credentials
aws secretsmanager get-secret-value \
    --secret-id <DB_SECRET_ARN> \
    --query SecretString --output text | jq
```

---

## Cost Estimate (Preview Phase)

| Service | Est. Monthly |
|---------|-------------|
| App Runner | $5-15 (scales to near-zero) |
| RDS t4g.micro | ~$15 |
| S3 | <$1 |
| Secrets Manager | <$1 |
| **Total** | ~$20-30/mo |

---

## Auth Strategy (Future)

Pluggable auth behind an interface:

```typescript
interface AuthProvider {
  validateSession(token: string): Promise<string | null>
  createSession(userId: string): Promise<string>
  destroySession(token: string): Promise<void>
  createUser(email: string, password: string): Promise<string>
  verifyCredentials(email: string, password: string): Promise<string | null>
}
```

- **Day 1:** Clerk or Supabase Auth
- **Later:** Roll-our-own if needed

---

## Related

- [Architecture Brainstorm](./architecture-brainstorm.md) — Exploring architecture options
- [Pricing Models](./pricing-models.md) — Cost considerations for the business model
