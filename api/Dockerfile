FROM golang:1.22-alpine

WORKDIR /app

# Copy go.mod and go.sum supporting both root and api context
COPY go.mo[d] go.su[m] api/go.mo[d] api/go.su[m] ./
RUN go mod download

# Copy source code
COPY . ./

# Build Go executable
RUN if [ -d "cmd/server" ]; then \
        CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bolt-api ./cmd/server ; \
    else \
        CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bolt-api ./api/cmd/server ; \
    fi

EXPOSE 8080

CMD ["/app/bolt-api"]
