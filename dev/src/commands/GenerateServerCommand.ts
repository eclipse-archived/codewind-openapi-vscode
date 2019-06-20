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
import ServerCommand from './ServerCommand';

async function generate(selection: vscode.TreeItem) : Promise<void> {
    var genCmd : ServerCommand = new ServerCommand("server");
    genCmd.generate(selection);
}

var id = 'codewind.openapi-generate-server';

export default {
    generate,
    id
};