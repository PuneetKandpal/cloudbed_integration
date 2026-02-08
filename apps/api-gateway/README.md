# API Gateway

This is the API Gateway service for the Hostelworld microservices architecture. It acts as a single entry point for all client requests and routes them to the appropriate microservices.

## Features

- **Request Routing**: Routes requests to appropriate microservices based on URL patterns
- **Load Balancing**: Can be extended to support load balancing across multiple instances
- **CORS Support**: Enabled for cross-origin requests
- **Health Check**: Monitor the status of all microservices
- **Error Handling**: Centralized error handling and response formatting

## Services

The gateway routes to the following microservices:

- **Booking Service**: `/api/booking/*` → Port 3007
- **Cloudbeds Integration**: `/api/cloudbeds/*` → Port 3002
- **Payment Service**: `/api/payment/*` → Port 3009
- **Notification Service**: `/api/notification/*` → Port 3011
- **Audit Service**: `/api/audit/*` → Port 3005
- **Booking Policy Service**: `/api/booking-policy/*` → Port 3008

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update the .env file with your service URLs and ports
```

## Running the Gateway

```bash
# Development mode
npm run start:dev:gateway

# Production mode
npm run build:gateway
npm run start:gateway
```

## API Endpoints

### Health Check
```
GET /api/health
```

Returns the health status of the gateway and all configured microservices.

### Service Routes
All requests are proxied to the respective microservices:

```
# Booking Service
GET|POST|PUT|DELETE /api/booking/*

# Cloudbeds Integration
GET|POST|PUT|DELETE /api/cloudbeds/*

# Payment Service
GET|POST|PUT|DELETE /api/payment/*

# Notification Service
GET|POST|PUT|DELETE /api/notification/*

# Audit Service
GET|POST|PUT|DELETE /api/audit/*

# Booking Policy Service
GET|POST|PUT|DELETE /api/booking-policy/*
```

## Environment Variables

- `API_GATEWAY_PORT`: Port for the API gateway (default: 3000)
- `{SERVICE}_URL`: URL for each microservice
- `{SERVICE}_PORT`: Port for each microservice

## Example Usage

```bash
# Check gateway health
curl http://localhost:3000/api/health

# Access booking service through gateway
curl http://localhost:3000/api/booking/bookings

# Access cloudbeds service through gateway
curl http://localhost:3000/api/cloudbeds/properties
```
