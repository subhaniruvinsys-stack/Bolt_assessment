FROM golang:1.22-alpine

WORKDIR /app

# Copy dependency manifests
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build Go executable
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bolt-api ./cmd/server

EXPOSE 8080

CMD ["/app/bolt-api"]
