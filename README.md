# Codewind OpenAPI Tools for VS Code

The Codewind OpenAPI Tools for VS Code provide commands that invoke the OpenAPI Generator to create API clients, server stubs, and HTML documentation from OpenAPI Specifications. The tools are integrated with and are customized to work with Codewind for VS Code but they can work standalone without the Codewind extension.

## Getting started

1. Install [VS Code version 1.27 or later](https://code.visualstudio.com/download).
2. Install Codewind for VS Code from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBM.codewind-tools) or by searching for "Codewind" in the [VS Code Extensions view](https://code.visualstudio.com/docs/editor/extension-gallery#_browse-for-extensions).
3. This extension pulls the [OpenAPI Generator CLI Docker Image](https://github.com/OpenAPITools/openapi-generator#16---docker) and runs the OpenAPI generator in a Docker container. Install Docker if necessary.

## How to use
- To access the commands, navigate to the **Explorer** view group and open the **Codewind** view.
- Open the [**Command Palette**](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and type "OpenAPI" to see the actions available.
- Or, to access the context menu commands, from the Codewind view, bring up the context menu on a project and select one of the Generate actions.
- Ensure the OpenAPI definition is in the folder/project prior to running the commands
- After generation, edit .openapi-generator-ignore to ensure subsequent code generation does not overwrite custom code

## Features
- Generate API clients in any of the supported [languages/frameworks](https://github.com/OpenAPITools/openapi-generator#overview)
- Generate server stubs in any of the supported [languages/frameworks](https://github.com/OpenAPITools/openapi-generator#overview)
- Generate HTML documentation from an OpenAPI definition file.
