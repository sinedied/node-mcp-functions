#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

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

class WeatherServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "weather-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get-alerts",
            description: "Get weather alerts for a state",
            inputSchema: {
              type: "object",
              properties: {
                state: {
                  type: "string",
                  description: "Two-letter state code (e.g. CA, NY)",
                  minLength: 2,
                  maxLength: 2,
                },
              },
              required: ["state"],
            },
          },
          {
            name: "get-forecast",
            description: "Get weather forecast for a location",
            inputSchema: {
              type: "object",
              properties: {
                latitude: {
                  type: "number",
                  description: "Latitude of the location",
                  minimum: -90,
                  maximum: 90,
                },
                longitude: {
                  type: "number",
                  description: "Longitude of the location",
                  minimum: -180,
                  maximum: 180,
                },
              },
              required: ["latitude", "longitude"],
            },
          },
        ] as Tool[],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get-alerts":
          return await this.getAlerts(args?.state as string);
        case "get-forecast":
          return await this.getForecast(
            args?.latitude as number,
            args?.longitude as number
          );
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async getAlerts(state: string): Promise<{ content: any[] }> {
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
            type: "text",
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
            type: "text",
            text: `Error fetching weather alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  private async getForecast(latitude: number, longitude: number): Promise<{ content: any[] }> {
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
            type: "text",
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
            type: "text",
            text: `Error fetching weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Weather MCP server running on stdio");
  }
}

const server = new WeatherServer();
server.run().catch(console.error);
