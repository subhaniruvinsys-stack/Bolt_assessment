# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy dependency files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bolt-api ./cmd/server

# Production stage — minimal image
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /bolt-api .

EXPOSE 8080

CMD ["./bolt-api"]
