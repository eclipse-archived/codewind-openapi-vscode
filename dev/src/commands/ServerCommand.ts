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
import Constants from "../constants/Constants";
import AbstractGenerateStubCommand from './AbstractGenerateStubCommand';

export default class ServerCommand extends AbstractGenerateStubCommand {

    protected quickPickOptionGeneratorTypes: vscode.QuickPickOptions = Constants.QUICK_PICK_OPTION_SERVER_TYPES;

    // Go
    protected goTypes : string[] = ['go-gin-server', 'go-server'];
    // Java - Lagom, MP/JEE, Spring
    protected javaTypes : string[] = ['jaxrs-spec',
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
                                        'jaxrs-resteasy-eap'
                                    ];

    protected javaSpringTypes : string[] = ['spring'];

    protected codewindTypes : string[] = ['jaxrs-spec','jaxrs-cxf'];

    // Node
    protected nodeTypes : string[] = ['nodejs-server'];
    // Python
    protected pythonTypes : string[] = ['python-flask'];
    // Swift
    protected swiftTypes : string[] = [];

}