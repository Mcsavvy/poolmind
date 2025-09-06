# PoolMind Deployment Makefile

.PHONY: help build dev prod clean logs health

# Default target
help:
	@echo "PoolMind Deployment Commands:"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development environment with Docker Compose"
	@echo "  make dev-build    - Build and start development environment"
	@echo "  make dev-logs     - View development logs"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production environment"
	@echo "  make prod-build   - Build and start production environment"
	@echo "  make prod-logs    - View production logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        - Clean up containers and volumes"
	@echo "  make health       - Check service health"
	@echo "  make logs         - View all service logs"

# Development commands
dev:
	@echo "🚀 Starting PoolMind development environment..."
	docker-compose up -d
	@echo "✅ Development environment started!"
	@echo "🌐 Platform: http://localhost:3000"
	@echo "🔧 Orchestrator: http://localhost:3001"
	@echo "📚 API Docs: http://localhost:3001/api/docs"

dev-build:
	@echo "🔨 Building and starting development environment..."
	docker-compose up --build -d
	@echo "✅ Development environment built and started!"

dev-logs:
	@echo "📋 Viewing development logs..."
	docker-compose logs -f

# Production commands
prod:
	@echo "🚀 Starting PoolMind production environment..."
	docker-compose -f docker-compose.prod.yml up -d
	@echo "✅ Production environment started!"

prod-build:
	@echo "🔨 Building and starting production environment..."
	docker-compose -f docker-compose.prod.yml up --build -d
	@echo "✅ Production environment built and started!"

prod-logs:
	@echo "📋 Viewing production logs..."
	docker-compose -f docker-compose.prod.yml logs -f

# Utility commands
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose down -v
	docker-compose -f docker-compose.prod.yml down -v
	docker system prune -f
	@echo "✅ Cleanup completed!"

logs:
	@echo "📋 Viewing all service logs..."
	docker-compose logs -f orchestrator platform

health:
	@echo "🔍 Checking service health..."
	@echo "Platform health:"
	@curl -s http://localhost:3000/api/health | jq . || echo "❌ Platform not responding"
	@echo ""
	@echo "Orchestrator health:"
	@curl -s http://localhost:3001/api/docs > /dev/null && echo "✅ Orchestrator healthy" || echo "❌ Orchestrator not responding"

# Build individual services
build-orchestrator:
	@echo "🔨 Building orchestrator service..."
	docker build -f apps/orchestrator/Dockerfile -t poolmind-orchestrator .

build-platform:
	@echo "🔨 Building platform service..."
	docker build -f apps/platform/Dockerfile -t poolmind-platform .

# Database commands
db-init:
	@echo "🗄️ Initializing MongoDB..."
	docker exec poolmind-mongodb-dev mongosh poolmind_dev --eval "print('Database initialized')"

# Backup commands
backup-db:
	@echo "💾 Creating database backup..."
	docker exec poolmind-mongodb-dev mongodump --db poolmind_dev --out /backup
	docker cp poolmind-mongodb-dev:/backup ./backup-$(shell date +%Y%m%d-%H%M%S)
	@echo "✅ Backup completed!"

# Update commands
update:
	@echo "🔄 Updating services..."
	git pull
	docker-compose -f docker-compose.prod.yml up --build -d
	@echo "✅ Services updated!"
