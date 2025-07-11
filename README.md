# Weather MCP Server

A Node.js Model Context Protocol (MCP) server that provides weather information tools.

## Features

- **get-alerts**: Get weather alerts for a US state
- **get-forecast**: Get weather forecast for a location using latitude/longitude coordinates

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript code:
```bash
npm run build
```

3. Run the server:
```bash
npm start
```

## Usage

This server implements the Model Context Protocol and communicates via stdio. It provides two tools:

### get-alerts
Get weather alerts for a US state.

**Parameters:**
- `state` (string): Two-letter state code (e.g., "CA", "NY")

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get-alerts",
    "arguments": {
      "state": "CA"
    }
  }
}
```

### get-forecast
Get weather forecast for a location using coordinates.

**Parameters:**
- `latitude` (number): Latitude (-90 to 90)
- `longitude` (number): Longitude (-180 to 180)

**Example:**
```json
{
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
}
```

## Development

- Run in development mode with auto-rebuild:
```bash
npm run dev
```

- Test the server:
```bash
node test.js
```

## API

This server uses the National Weather Service API (weather.gov) which provides free weather data for the United States.

## Directory Structure

```
weather-server/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Node.js dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── test.js              # Simple test script
└── README.md            # This file
```

## Requirements

- Node.js 18 or higher
- TypeScript 5.5 or higher
- Internet connection for weather API access
