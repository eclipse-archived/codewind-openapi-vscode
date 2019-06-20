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

export default class ClientCommand extends AbstractGenerateStubCommand {

    protected quickPickOptionGeneratorTypes: vscode.QuickPickOptions = Constants.QUICK_PICK_OPTION_CLIENT_TYPES;

    // Go
    protected goTypes : string[] = ['go'];
    // Java - Lagom, MP/JEE, Spring
    protected javaTypes : string[] = ['java', 'jaxrs-cxf-client'];
    // Node
    protected nodeTypes : string[] = ['javascript',
            'javascript-closure-angular',
            'javascript-flowtyped',
            'typescript-angular',
            'typescript-angularjs',
            'typescript-aurelia',
            'typescript-axios',
            'typescript-fetch',
            'typescript-inversify',
            'typescript-jquery',
            'typescript-node'
        ];
    // Python
    protected pythonTypes : string[] = ['python'];
    // Swift
    protected swiftTypes : string[] = ['swift3', 'swift4', 'swift2-deprecated'];

}