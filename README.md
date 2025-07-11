# Weather MCP Server

A Node.js Model Context Protocol (MCP) server that provides weather information tools using **Streamable HTTP Transport**.

## Features

- **get-alerts**: Get weather alerts for a US state
- **get-forecast**: Get weather forecast for a location using latitude/longitude coordinates
- **HTTP Transport**: Uses streamable HTTP instead of stdio for better scalability
- **Session Management**: Supports multiple concurrent client sessions
- **Health Check**: Built-in health monitoring endpoint

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Start the HTTP server:
```bash
npm start
```

The server will start on port 3000 by default.

## Usage

This server implements the Model Context Protocol using HTTP transport. It provides:

- **MCP Endpoint**: `http://localhost:3000/mcp`
- **Health Check**: `http://localhost:3000/health`

### get-alerts
Get weather alerts for a US state.

**Parameters:**
- `state` (string): Two-letter state code (e.g., "CA", "NY")

**HTTP Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: your-session-id" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get-alerts",
      "arguments": {
        "state": "CA"
      }
    }
  }'
```

### get-forecast
Get weather forecast for a location using coordinates.

**Parameters:**
- `latitude` (number): Latitude (-90 to 90)
- `longitude` (number): Longitude (-180 to 180)

**HTTP Example:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "mcp-session-id: your-session-id" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get-forecast",
      "arguments": {
        "latitude": 40.7128,
        "longitude": -74.0060
      }
    }
  }'
```

## MCP Client Configuration

Use this configuration in your MCP client:

```json
{
  "mcpServers": {
    "weather": {
      "transport": {
        "type": "http",
        "url": "http://localhost:3000/mcp"
      }
    }
  }
}
```

## Development

- Run in development mode:
```bash
npm run dev
```

- Test the server:
```bash
npm test
```

- Health check:
```bash
curl http://localhost:3000/health
```

## Transport Features

- **Session Management**: Each client gets a unique session ID
- **Concurrent Connections**: Multiple clients can connect simultaneously  
- **Server-Sent Events**: Real-time notifications via GET requests
- **Session Termination**: Clean session cleanup via DELETE requests
- **DNS Rebinding Protection**: Disabled for local development (enable in production)

## Security Note

For production deployments, enable DNS rebinding protection:

```typescript
// In src/index.ts
enableDnsRebindingProtection: true,
allowedHosts: ['your-domain.com'],
allowedOrigins: ['https://your-domain.com'],
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## API Endpoints

- `POST /mcp`: Main MCP communication endpoint
- `GET /mcp`: Server-to-client notifications (SSE)
- `DELETE /mcp`: Session termination
- `GET /health`: Health check endpoint

## Requirements

- Node.js 18 or higher
- TypeScript 5.5 or higher
- Internet connection for weather API access

## Directory Structure

```
weather-server/
├── src/
│   └── index.ts          # Main HTTP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── test.js              # HTTP client test script
├── mcp-config.json      # MCP client configuration
└── README.md            # This file
```

## Requirements

- Node.js 18 or higher
- TypeScript 5.5 or higher
- Internet connection for weather API access
