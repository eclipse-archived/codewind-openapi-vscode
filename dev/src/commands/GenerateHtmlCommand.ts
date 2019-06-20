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
import HtmlDocsCommand from './HtmlDocsCommand';

async function generate(selection: vscode.TreeItem) : Promise<void> {
    var genCmd : HtmlDocsCommand = new HtmlDocsCommand("html");
    genCmd.generate(selection);
}

var id = 'codewind.openapi-generate-html2';

export default {
    generate,
    id
};