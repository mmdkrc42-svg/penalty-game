.PHONY: dev prod build stop clean logs seed

# Development
dev:
	cp -n .env.example .env 2>/dev/null || true
	docker-compose up --build

dev-d:
	docker-compose up -d --build

# Production
prod:
	docker-compose -f docker-compose.prod.yml up -d --build

# Stop
stop:
	docker-compose down

stop-prod:
	docker-compose -f docker-compose.prod.yml down

# Build without starting
build:
	docker-compose build

# Clean everything
clean:
	docker-compose down -v --remove-orphans
	docker system prune -f

# Logs
logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

# Install deps locally
install:
	cd backend && npm install
	cd frontend && npm install

# Run locally (no Docker)
local-backend:
	cd backend && npm run start:dev

local-frontend:
	cd frontend && npm run dev

# Database
db-shell:
	docker-compose exec postgres psql -U blastcrates blastcrates

db-reset:
	docker-compose exec postgres psql -U blastcrates -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Migration
migrate:
	docker-compose exec backend npm run migration:run

# Shell access
shell-backend:
	docker-compose exec backend sh

shell-frontend:
	docker-compose exec frontend sh
