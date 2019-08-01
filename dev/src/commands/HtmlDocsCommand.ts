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
import AbstractGenerateCommand from './AbstractGenerateCommand';
import Translator from '../constants/Translator';
var dockerode = require('dockerode');

export default class HtmlDocsCommand extends AbstractGenerateCommand {

    constructor(_generatorType: string) {
        super(_generatorType);
    }

    public async generate(selection: vscode.TreeItem) : Promise<void> {
        this.projectName = "";
        this.localPath = vscode.Uri.parse("file://");
        this.imageExists = false;

        this.selectedDefinition = "";
        this.fqPathToDefinition = "";
        this.fqPathOutputLocation = "";

        try {
            // Check if the command is launched from codewind's view and the context is a known Microclimate project
            if (selection !== undefined) {
                await this.analyzeSelection(selection);
            }
            // If there is no project context then prompt for target project
            if (this.projectName === "") {
                await this.promptForProject();
            }
            // scan the project for OpenAPI definitions
            if (this.projectName !== "") {
                await this.gatherOpenApiDefinitions();
                await this.getOutputLocation();
                await this.callGenerator();
            }
        } catch (errorOrMessage) {
            Log.i("HTML generation stopped or failed. " + errorOrMessage);
        }
    }

    protected async doGeneration(progress: vscode.Progress<{}>) : Promise<void> {
        return new Promise<void>(async (resolve, reject) =>  {        
            var docker = new dockerode();

            var outStr = await this.enableProgressReporter(progress);

            Log.i("Mapped gen comamnd is " + 'generate -i /gen/' + this.selectedDefinition + ' -g ' + 'html2' + ' -o /out -v ' + this.fqPathToDefinition + ':/gen' + " -v " + this.fqPathOutputLocation +':/out');
            await docker.run(
                "openapitools/openapi-generator-cli:v4.0.1",               
                ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', 'html2', '-o', '/out'],
                outStr,
                {HostConfig: {"Binds": [`${this.fqPathToDefinition}:/gen`, `${this.fqPathOutputLocation}:/out`] }},
                {},
                async (err : any, data: any, ctnr: any) => {
                    ctnr.remove();
                    if (err) {
                        Log.e("docker.run error is: " + err);
                        vscode.window.showErrorMessage(Translator.getString("docGen.failedToGenerateHtml", err));
                        reject();
                    } else {
                        if (data !== null) {
                            Log.i("data.StatusCode = " + data.StatusCode);
                            Log.i("data.Error = " + data.Error);
                            if (data.StatusCode === 0) {
                                vscode.window.showInformationMessage(Translator.getString("docGen.success"));
                                resolve();                       
                            } else { // For other issues?
                                vscode.window.showInformationMessage(Translator.getString("docGen.failedNonZeroStatus", data.StatusCode,  data.Error));    
                                reject();
                            }    
                        } else {
                            reject();
                        }
                    }
                }
            );
        });
    }
}
