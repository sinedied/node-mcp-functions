#!/usr/bin/env node

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

interface WeatherAlert {
  event: string;
  headline: string;
  description: string;
  severity: string;
  areas: string;
}

interface WeatherData {
  location: string;
  temperature: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  forecast: string[];
}

function createWeatherServer(): McpServer {
  const server = new McpServer({
    name: "weather-server",
    version: "1.0.0",
  });

  // Register get-alerts tool
  server.registerTool(
    "get-alerts",
    {
      title: "Get Weather Alerts",
      description: "Get weather alerts for a state",
      inputSchema: {
        state: z.string().min(2).max(2).describe("Two-letter state code (e.g. CA, NY)"),
      },
    },
    async ({ state }) => {
      if (!state || state.length !== 2) {
        throw new Error("State must be a valid two-letter state code");
      }

      try {
        const response = await fetch(
          `https://api.weather.gov/alerts/active?area=${state.toUpperCase()}`
        );
        
        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        const alerts = data.features || [];

        const formattedAlerts: WeatherAlert[] = alerts.map((alert: any) => ({
          event: alert.properties.event,
          headline: alert.properties.headline,
          description: alert.properties.description,
          severity: alert.properties.severity,
          areas: alert.properties.areaDesc,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: formattedAlerts.length > 0 
                ? `Found ${formattedAlerts.length} active weather alerts for ${state.toUpperCase()}:\n\n${formattedAlerts
                    .map((alert, i) => 
                      `${i + 1}. **${alert.event}** (${alert.severity})\n` +
                      `   ${alert.headline}\n` +
                      `   Areas: ${alert.areas}\n`
                    )
                    .join('\n')}`
                : `No active weather alerts for ${state.toUpperCase()}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching weather alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  // Register get-forecast tool
  server.registerTool(
    "get-forecast",
    {
      title: "Get Weather Forecast",
      description: "Get weather forecast for a location",
      inputSchema: {
        latitude: z.number().min(-90).max(90).describe("Latitude of the location"),
        longitude: z.number().min(-180).max(180).describe("Longitude of the location"),
      },
    },
    async ({ latitude, longitude }) => {
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error("Invalid coordinates");
      }

      try {
        // Get the forecast office and grid coordinates
        const pointResponse = await fetch(
          `https://api.weather.gov/points/${latitude},${longitude}`
        );
        
        if (!pointResponse.ok) {
          throw new Error(`Weather API error: ${pointResponse.status}`);
        }

        const pointData = await pointResponse.json();
        const forecastUrl = pointData.properties.forecast;

        // Get the forecast
        const forecastResponse = await fetch(forecastUrl);
        
        if (!forecastResponse.ok) {
          throw new Error(`Forecast API error: ${forecastResponse.status}`);
        }

        const forecastData = await forecastResponse.json();
        const periods = forecastData.properties.periods || [];

        const forecast = periods.slice(0, 5).map((period: any) => ({
          name: period.name,
          temperature: period.temperature,
          temperatureUnit: period.temperatureUnit,
          windSpeed: period.windSpeed,
          windDirection: period.windDirection,
          shortForecast: period.shortForecast,
          detailedForecast: period.detailedForecast,
        }));

        return {
          content: [
            {
              type: "text" as const,
              text: `Weather forecast for ${latitude}, ${longitude}:\n\n${forecast
                .map((period: any) => 
                  `**${period.name}**\n` +
                  `Temperature: ${period.temperature}°${period.temperatureUnit}\n` +
                  `Wind: ${period.windSpeed} ${period.windDirection}\n` +
                  `Conditions: ${period.shortForecast}\n` +
                  `${period.detailedForecast}\n`
                )
                .join('\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  return server;
}

// Express app setup
const app = express();
app.use(express.json());

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req: Request, res: Response) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
      // DNS rebinding protection disabled for local testing
      enableDnsRebindingProtection: false,
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const server = createWeatherServer();

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Weather MCP server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

export default app;
