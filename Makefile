.PHONY: build test run dev

build:
	@echo "Building Go backend..."
	@cd api && "C:\Program Files\Go\bin\go.exe" build -o bin/server.exe ./cmd/server
	@echo "Building React frontend..."
	@cd frontend && npm run build

test:
	@echo "Running Go unit tests..."
	@cd api && "C:\Program Files\Go\bin\go.exe" test -v ./...

run:
	@cd api && "C:\Program Files\Go\bin\go.exe" run ./cmd/server

dev:
	@echo "Starting dev environment..."
	@cd frontend && npm run dev
