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

GitHub Actions ECR build uses the root `Dockerfile` symlink (build context `.`). Do not delete files under `docker/` without updating the workflow and symlinks.
