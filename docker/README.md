# Docker assets

Production and local Compose files live in this directory. From the repo root, thin symlinks point here:

| Path | Target |
|------|--------|
| `Dockerfile` | `docker/Dockerfile` |
| `docker-compose.yml` | `docker/docker-compose.yml` |
| `docker-compose.dev.yml` | `docker/docker-compose.dev.yml` |

## Commands (from repo root)

```bash
# Full stack (Postgres + backend + frontend)
docker compose up -d

# Postgres only (run backend/frontend with npm locally)
docker compose -f docker-compose.dev.yml up -d
```

These assets are for **local development only** (production deploys to Render via `render.yaml`; the AWS ECR pipeline was removed). Do not delete files under `docker/` without updating the root symlinks and any scripts that reference them.
