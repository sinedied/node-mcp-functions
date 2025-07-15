---
mode: agent
description: Adds the necessary files to turn a standard MCP server into an MCP server that runs on Azure Functions.
model: Claude Sonnet 4
tools: ['codebase', 'editFiles', 'fetch', 'problems', 'runCommands', 'search', 'searchResults', 'terminalLastCommand', 'usages']
---

Your goal is to take the MCP server in the current codebase and add the necessary files to turn it into an MCP server that runs on Azure Functions.

## Prerequisites

- Languages supported: Node.js (TypeScript, JavaScript), Python, C#
- Create the Azure Functions project structure in the root of the MCP server project (e.g., folder where `package.json`, or `*.csproj` is located). If you can't find the root, ask for it.

## Steps

Take these general steps to convert the MCP server into an Azure Functions app.

### Create the Azure Functions project structure

Add the necessary files to run the MCP server as a custom handler in Azure Functions.

1. Create a `host.json` file with the following content:
    ```json
    {
        "version": "2.0",
        "extensions": {
            "http": {
                "routePrefix": ""
            }
        },
        "customHandler": {
            "description": {
                "defaultExecutablePath": "",
                "workingDirectory": "",
                "arguments": []
            },
            "enableForwardingHttpRequest": true,
            "enableHttpProxyingRequest": true
        }
    }
    ```

    **IMPORTANT**: Do not remove the properties `enableForwardingHttpRequest` and `enableHttpProxyingRequest`, even if the property is not recognized in the JSON schema. They are required for the MCP server to work correctly with Azure Functions.

    Set `defaultExecutablePath` and (optionally) `arguments` to the correct command to run the MCP server.
        - For Node.js, this is typically `node` with an argument of the path to the compiled JavaScript file (e.g., `server.js`). Don't use `npm` in case it's not installed in the Azure Functions environment.
        - For Python, this would be `python` with the path to the main script.
        - For C#, this would be `dotnet` with the path to the compiled DLL (e.g., `bin/Release/net8.0/MyMcpServer.dll`). Assume `Release` configuration is used.

1. Create a folder named `function-route` in the root of the MCP server project. Inside the folder, create a file named `function.json` with the following content:
    ```json
    {
        "bindings": [
            {
                "authLevel": "anonymous",
                "type": "httpTrigger",
                "direction": "in",
                "name": "req",
                "methods": ["get", "post", "put", "delete", "patch", "head", "options"],
                "route": "{*route}"
            },
            {
                "type": "http",
                "direction": "out",
                "name": "res"
            }
        ]
    }
    ```


1. Create a `local.settings.json` file with the following content:
    ```json
    {
        "IsEncrypted": false,
        "Values": {
            "FUNCTIONS_WORKER_RUNTIME": "custom"
        }
    }
    ```

### Update the MCP server code

Modify the MCP server code to listen for HTTP requests on the port specified by the Azure Functions environment variable `FUNCTIONS_CUSTOMHANDLER_PORT`. This is typically done by reading the environment variable in your server code and using it to set the port for the HTTP server.

## Add AzD template

Create an `infra` folder and an `azure.yaml` file so that the MCP server can be deployed using the Azure Developer CLI (AzD).

First, use the terminal to download a zip of this repository: https://github.com/Azure-Samples/functions-quickstart-python-http-azd . Extract the contents and copy the `azure.yaml` file to the `infra` folder in your MCP server project and delete the zip file.

Next, modify the `azure.yaml` file and Bicep files to match the runtime/language of the MCP server project.

## Summarize the changes

Summarize the changes made and outline the next steps for the user to deploy the MCP server on Azure Functions, but do not deploy it yet.

