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

### Additional validations

**Important**: Ensure the MCP server uses streamable HTTP transport and is stateless. If either of these conditions is not met, the MCP server will not work correctly in Azure Functions. Do not proceed.

Ensure the MCP server uses streamable HTTP transport, not stdio.
- For Node.js, look for code that uses `StreamableHTTPServerTransport`.
- For Python, if using FastMCP, ensure the server is run with `transport="streamable-http"`.

Ensure the MCP server is stateless.
- For Node.js, `StreamableHTTPServerTransport` must not have `sessionIdGenerator` configured.
- For Python, if using FastMCP, ensure the server is created with `stateless_http=True`.

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
        - For Python, this would be `python` with the path to the main script. If it's unclear which script to use, look for one that initializes the MCP server (e.g., look for file using `FastMCP`) or ask for help.
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

**Important** additional language-specific instructions:
- **Python**:
    - If the server uses FastMCP, you can pass this port to the `FastMCP` constructor like: `mcp = FastMCP("my-mcp", port=mcp_port)`.

## Add AzD template

Create an `infra` folder and an `azure.yaml` file so that the MCP server can be deployed using the Azure Developer CLI (AzD).

First, use the terminal to download a zip of this repository: https://github.com/Azure-Samples/functions-quickstart-python-http-azd . Extract the zip into a folder named `unzip`. Copy the `azure.yaml` file and the `infra` folder to your MCP server project. Delete the zip file and `unzip` folder after copying the files.

Next, modify the `azure.yaml` file to match the runtime/language of the MCP server project.

In the Bicep files, change the function app's name to reflect the MCP server project name.

Also in the Bicep files, change the runtime and runtime version to based on the following rules:
- For Node.js, use `node` and `22`
- For Python, use `python` and the version of Python used in the MCP server project (e.g., `3.10`)
- For C#, use `custom` and `1.0`

Additionally, for Python, add an app setting to the function app:
- `PYTHONPATH` = `/home/site/wwwroot/.python_packages/lib/site-packages`

## Additional files

Don't worry about adding additional files like `.funcignore` or READMEs. Also don't worry about running in depth tests.

## Summarize the changes

Summarize the changes made and outline the next steps (`azd up`) for the user to deploy the MCP server on Azure Functions, but do not deploy it yet.

