/*******************************************************************************
 * Copyright (c) 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
import * as vscode from 'vscode';
import Log from '../util/Logger';
import Translator from './Translator';

/*
CLIENT generators:
    - ada
    - android
    - apex
    - bash
    - c
    - clojure
    - cpp-qt5-client
    - cpp-restsdk
    - cpp-tizen
    - csharp
    - csharp-dotnet2
    - csharp-netcore
    - dart
    - dart-jaguar
    - eiffel
    - elixir
    - elm
    - erlang-client
    - erlang-proper
    - flash
    - go
    - groovy
    - haskell-http-client
    - java
    - javascript
    - javascript-closure-angular
    - javascript-flowtyped
    - jaxrs-cxf-client
    - jmeter
    - kotlin
    - lua
    - objc
    - perl
    - php
    - powershell
    - python
    - r
    - ruby
    - rust
    - scala-akka
    - scala-gatling
    - scala-httpclient-deprecated
    - scalaz
    - swift2-deprecated
    - swift3-deprecated
    - swift4
    - typescript-angular
    - typescript-angularjs
    - typescript-aurelia
    - typescript-axios
    - typescript-fetch
    - typescript-inversify
    - typescript-jquery
    - typescript-node
    - typescript-rxjs


SERVER generators:
    - ada-server
    - aspnetcore
    - cpp-pistache-server
    - cpp-qt5-qhttpengine-server
    - cpp-restbed-server
    - csharp-nancyfx
    - erlang-server
    - go-gin-server
    - go-server
    - graphql-nodejs-express-server
    - haskell
    - java-inflector
    - java-msf4j
    - java-pkmst
    - java-play-framework
    - java-undertow-server
    - java-vertx
    - jaxrs-cxf
    - jaxrs-cxf-cdi
    - jaxrs-cxf-extended
    - jaxrs-jersey
    - jaxrs-resteasy
    - jaxrs-resteasy-eap
    - jaxrs-spec
    - kotlin-server
    - kotlin-spring
    - nodejs-express-server, nodejs-server-deprecated
    - php-laravel
    - php-lumen
    - php-silex
    - php-slim
    - php-symfony
    - php-ze-ph
    - python-aiohttp
    - python-blueplanet
    - python-flask
    - ruby-on-rails
    - ruby-sinatra
    - rust-server
    - scala-finch
    - scala-lagom-server
    - scala-play-server
    - scalatra
    - spring


DOCUMENTATION generators:
    - cwiki
    - dynamic-html
    - html
    - html2
    - openapi
    - openapi-yaml
*/
export default class Constants {

    // Based on package.json
    public static readonly EXTENSION_ID: string = "IBM.codewind-openapi-tools";
    public static readonly PRIMARY_LANGUAGES : string[] = ['Go', 'Java', 'Node.js', 'Python', 'Swift'];
    public static ALL_CLIENT_LANGUAGES : [string, string[]][] = [
        ['Go', ['go']],
        ['Java', ['java', 'jaxrs-cxf-client']],
        ['Node.js', ['javascript',
                    'javascript-closure-angular',
                    'javascript-flowtyped',
                    'typescript-angular',
                    'typescript-angularjs',
                    'typescript-aurelia',
                    'typescript-axios',
                    'typescript-fetch',
                    'typescript-inversify',
                    'typescript-jquery',
                    'typescript-node']],
        ['Python', ['python']],
        ['Swift', ['swift3', 'swift4', 'swift2-deprecated']],
        ['Ada', ['ada']],
        ['Apex', ['apex']],
        ['Bash', ['bash']],
        ['C', ['c']],
        ['C#', ['csharp', 'csharp-dotnet2', 'csharp-refactor']],
        ['C++', ['cpp-qt5', 'cpp-restsdk', 'cpp-tizen']],
        ['Dart', ['dart', 'dart-jaguar']],
        ['Eiffel', ['eiffel']],
        ['Elixir', ['elixir']],
        ['Elm', ['elm']],
        ['Erlang', ['erlang-client', 'erlang-proper']],
        ['Haskell', ['haskell-http-client']],
        ['Kotlin', ['kotlin']],
        ['Lua', ['lua']],
        ['Objective-C', ['objc']],
        ['Perl', ['perl']],
        ['PHP', ['php']],
        ['PowerShell', ['powershell']],
        ['R', ['r']],
        ['Ruby', ['ruby']],
        ['Rust', ['rust']],
        ['Scala', ['scala-akka','scala-gatling','scala-httpclient','scalaz']],
        ['TypeScript', ['typescript-angular',
            'typescript-angularjs',
            'typescript-aurelia',
            'typescript-axios',
            'typescript-fetch',
            'typescript-inversify',
            'typescript-jquery',
            'typescript-node']]
    ];
    public static ALL_SERVER_LANGUAGES : [string, string[]][] = [
        ['Go', ['go-gin-server', 'go-server']],
        ['Java', ['jaxrs-spec',
            'java-inflector',
            'java-msf4j',
            'java-pkmst',
            'java-play-framework',
            'java-undertow-server',
            'java-vertx',
            'jaxrs-cxf',
            'jaxrs-cxf-cdi',
            'jaxrs-jersey',
            'jaxrs-resteasy',
            'jaxrs-resteasy-eap',
            'spring']],
        ['Node.js', ['nodejs-express-server', 'nodejs-server-deprecated']],
        ['Python', ['python-flask']],
        ['Swift', []],
        ['Ada', ['ada-server']],
        ['C#', ['csharp-nancyfx']],
        ['C++', ['cpp-pistache-server', 'cpp-qt5-qhttpengine-server', 'cpp-restbed-server']],
        ['Erlang', ['erlang-server']],
        ['Haskell', ['haskell']],
        ['Kotlin', ['kotlin-server', 'kotlin-spring']],
        ['PHP', ['php-laravel', 'php-lumen', 'php-silex', 'php-slim', 'php-symfony', 'php-ze-ph']],
        ['Python', ['python-flask']],
        ['Ruby', ['ruby-on-rails', 'ruby-sinatra']],
        ['Rust', ['rust-server']],
        ['Scala', ['scala-finch','scala-lagom-server', 'scalatra']],
    ];

    private static vvv = "Project";

    public static readonly QUICK_PICK_OPTION_PROJECT_FOLDERS: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: Translator.getString("commands.selectProject"),
        onDidSelectItem: (item) => Log.i(`Item ${item} is selected`)
    };
    
    public static readonly QUICK_PICK_OPTION_OPENAPI_DEFINITIONS: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: Translator.getString("commands.selectOpenApiDefinition"),
        onDidSelectItem: (item) => Log.i(`Item ${item} is selected`)
    };

    public static readonly QUICK_PICK_OPTION_LANGUAGES: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: Translator.getString("commands.selectPrimaryLanguage"),
        onDidSelectItem: (item) => Log.i(`Item ${item} is selected`)
    };
    
    public static readonly QUICK_PICK_OPTION_CLIENT_TYPES: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: Translator.getString("commands.selectClientGenType"),
        onDidSelectItem: (item) => Log.i(`Item ${item} is selected`)
    };

    public static readonly QUICK_PICK_OPTION_SERVER_TYPES: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: false,
        placeHolder: Translator.getString("commands.selectServerGenType"),
        onDidSelectItem: (item) => Log.i(`Item ${item} is selected`)
    };

    public static readonly OPENAPI_GENERATOR_IGNORE_FILE_EXISTS: string = "OPENAPI_GENERATOR_IGNORE_FILE_EXISTS";
}