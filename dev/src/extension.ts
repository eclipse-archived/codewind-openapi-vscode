/*******************************************************************************
 * Copyright (c) 2019 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 2.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
"use strict";
import * as vscode from 'vscode';

import clientGenerate from "./commands/GenerateClientCommand";
import serverGenerate from "./commands/GenerateServerCommand";
import htmlGenerate from "./commands/GenerateHtmlCommand";
import Log from './util/Logger';
import translator from './constants/Translator';

export function activate(context: vscode.ExtensionContext) {
	try {
		translator.init();
	} catch (err) {

	}
	Log.setLogFilePath(context);
	context.subscriptions.push(vscode.commands.registerCommand(clientGenerate.id, (selection) => clientGenerate.generate(selection)));
	context.subscriptions.push(vscode.commands.registerCommand(serverGenerate.id, (selection) => serverGenerate.generate(selection)));
	context.subscriptions.push(vscode.commands.registerCommand(htmlGenerate.id, (selection) => htmlGenerate.generate(selection)));
}

export function deactivate() {

}
