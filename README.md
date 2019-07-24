[![License](https://img.shields.io/badge/License-EPL%202.0-red.svg?label=license&logo=eclipse)](https://www.eclipse.org/legal/epl-2.0/)
[![Chat](https://img.shields.io/static/v1.svg?label=chat&message=mattermost&color=145dbf)](https://mattermost.eclipse.org/eclipse/channels/eclipse-codewind)
[![Gitter](https://badges.gitter.im/OpenAPITools/openapi-generator.svg)](https://gitter.im/OpenAPITools/openapi-generator)

# Codewind OpenAPI Tools for VS Code

The Codewind OpenAPI Tools for VS Code provides commands that invoke the OpenAPI Generator to create API clients, server stubs, and HTML documentation from OpenAPI Specifications. The tools are integrated and customized to work with Codewind for VS Code, but they can also work without the Codewind extension.

## Installing
1. Install [VS Code version 1.27 or later](https://code.visualstudio.com/download).
2. (OPTIONAL) Install Codewind for VS Code from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=IBM.codewind-tools) or by searching for `Codewind` in the [VS Code Extensions view](https://code.visualstudio.com/docs/editor/extension-gallery#_browse-for-extensions).
3. This extension pulls the [OpenAPI Generator CLI Docker Image](https://github.com/OpenAPITools/openapi-generator#16---docker) and runs the OpenAPI Generator in a Docker container. Install Docker if necessary.

## Running commands
1. Before you run a command, ensure the OpenAPI definition is in the folder or project.
2. If you have **Codewind** installed, go to the **Explorer** view group and open the **Codewind** view.
  - Access the context menu commands from the Codewind view, go to the context menu on a project and select one of the **Generate** actions.
3. The commands are also available from the **Command Palette** .
  - Open the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) and type `OpenAPI` to see the actions available.
4. After you generate code, edit the `.openapi-generator-ignore` file to ensure that subsequent code generation does not overwrite custom code.

## Features
- Generate API clients in any of the supported [languages/frameworks](https://github.com/OpenAPITools/openapi-generator#overview).
- Generate server stubs in any of the supported [languages/frameworks](https://github.com/OpenAPITools/openapi-generator#overview).
- Generate HTML documentation from an OpenAPI definition file.

## Contributing
- [Submitting issues](https://github.com/eclipse/codewind-openapi-vscode/issues)
