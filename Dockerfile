FROM golang:1.22-alpine

WORKDIR /app

# Copy all repository source files
COPY . .

# Build Go executable (handles both root context and /api context)
RUN if [ -f "api/go.mod" ]; then \
        cd api && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bolt-api ./cmd/server ; \
    else \
        CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bolt-api ./cmd/server ; \
    fi

EXPOSE 8080

CMD ["/app/bolt-api"]
