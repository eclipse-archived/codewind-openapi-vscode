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
import { Dirent as dirent} from 'fs';
import Constants from "../constants/Constants";
import Log from '../util/Logger';
import { Stream } from 'stream';
import AbstractDockerCommand from './AbstractDockerCommand';
import Translator from '../constants/Translator';
var fs = require('fs');
var dockerode = require('dockerode');

export default abstract class AbstractGenerateCommand extends AbstractDockerCommand {
    protected projectName: string = "";
    protected localPath: vscode.Uri = vscode.Uri.parse("file://");
    protected selectedDefinition: string = "";
    protected fqPathToDefinition: string = "";
    protected fqPathOutputLocation: string = "";
    protected preferredSourceLocation: string = "";
    protected childSourceFolderToAppend: string = "";
    protected projectLanguage: string = "";

    constructor(protected readonly _generatorType: string) {
        super();
    }

    protected async abstract doGeneration(progress: vscode.Progress<{}>) : Promise<void>;

    protected async analyzeSelection(selection: vscode.TreeItem) {
        if (selection !== undefined) {
            if (Reflect.has(selection, "name")) {
                this.projectName = Reflect.get(selection, "name");
            }
            if (Reflect.has(selection, "localPath")) {
                this.localPath = Reflect.get(selection, "localPath");
            }
            Log.i("Selected project is: " + this.projectName);
            Log.i("Selected project local path is: " + this.localPath.fsPath + " , " + this.localPath.path);
        }
    }

    protected async promptForProject() {
        let workspaceFolders = vscode.workspace.workspaceFolders;
        var workspaces: vscode.WorkspaceFolder[] = [];
        var workspaceNames: string[] = [];
        if (workspaceFolders) {
            var folders: string[] = [];
            let workspaceFolderContents: Array<dirent>;
            var fullFolderPaths: string[] = [];
            for (var i = 0; i < workspaceFolders.length; i++) {
                workspaces.push(workspaceFolders[i]);
                workspaceNames.push(workspaceFolders[i].name);

                var wsFolder = workspaceFolders[i];
                var filePath = wsFolder.uri.fsPath;
                workspaceFolderContents = fs.readdirSync(filePath, { withFileTypes: true });                    
                workspaceFolderContents.forEach((ff: dirent) => {
                    var fsdir = ff as dirent;
                    try {
                        var name = (fsdir.name !== null && fsdir.name !== undefined) ? fsdir.name.toString() : fsdir.toString();
                        if (fs.lstatSync(filePath + "/" + name).isDirectory() && !name.startsWith('.')) {
                            folders.push(name);
                            fullFolderPaths.push(wsFolder.uri.toString() + "/" + name);
                        }
                    } catch (error) {
                        Log.e("ERROR : " + error);
                    }
                });
            }

            if (folders.length > 0) {
                await vscode.window.showQuickPick(folders, Constants.QUICK_PICK_OPTION_PROJECT_FOLDERS).then(async (selectedFolder: string | undefined) => {
                    if (selectedFolder === undefined) {
                        return;
                    }
                    var idx = folders.indexOf(selectedFolder);
                    this.localPath = vscode.Uri.parse(fullFolderPaths[idx]);
                    this.projectName = selectedFolder;
                });
                if (this.projectName === "") {
                    return;
                }
                var breakForEach = {};
                try {
                    filePath = this.localPath.path;
                    var dotProjectFolder = fs.readdirSync(filePath + "/../.projects", { withFileTypes: true });                                
                    dotProjectFolder.forEach((projInfFile: dirent) => {
                        var name = (projInfFile.name !== null && projInfFile.name !== undefined) ? projInfFile.name.toString() : projInfFile.toString();
                        var contents = fs.readFileSync(filePath + "/../.projects/" + name);
                        var jsonObject = JSON.parse(contents);
                        if (this.projectName === jsonObject.name) {
                            this.projectLanguage = jsonObject.language;
                            throw breakForEach;
                        }
                    });
                } catch (err) {
                    // ignore if there is no .projects folder potentially MC's
                    if (err === breakForEach) {
                        Log.i("Language from meta data is " + this.projectLanguage);
                    } else {
                        Log.e("Error parsing project inf file: " + err);
                    }
                }
            } else {
                await vscode.window.showErrorMessage(Translator.getString("wizard.errorNoFoldersInWorkspace"));
                return;
            }
        }
    }

    protected async getOutputLocation() : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            var openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: this.childSourceFolderToAppend.length === 0 ? this.localPath : vscode.Uri.parse(this.localPath.toString() + this.childSourceFolderToAppend),
                openLabel: Translator.getString("wizard.selectOutputFolder") // Has to be short, for the 'button'
            };
            var selectedWSFolder: vscode.Uri[] = [];
            selectedWSFolder = await vscode.window.showOpenDialog(openDialogOptions).then((tempSelectedWSFolder) => {
                Log.i("Selected workspace folder output location = " + tempSelectedWSFolder);
                if (tempSelectedWSFolder === undefined) {
                    return [];
                }
                return tempSelectedWSFolder;
            });
            if (selectedWSFolder.length === 0) {
                reject("Output folder was not selected.");  // For log
                return;  // Dialog was canceled
            }
            var selectedOutputLocation = selectedWSFolder[0].path;
            // ***** -o Generator output option ***
            this.fqPathOutputLocation = selectedOutputLocation;
            // ************************************   
            try {
                if (fs.lstatSync(this.fqPathOutputLocation + "/.openapi-generator-ignore").isFile()) {
                    const response = await vscode.window.showWarningMessage(Translator.getString("wizard.promptToOverwrite"), {modal : true}, Translator.getString("wizard.yes"));
                    if (response === Translator.getString("wizard.yes")) {
                        resolve();
                    } else {
                        reject("Overwrite files was declined");  // For log
                    }
                } else {
                    reject(false); // It's a folder
                }
            } catch (e) {
                // .openapi-generator-ignore file does not exist, so should be ok to generate without overwriting files
                resolve();
            }
        });
    }

    protected async callGenerator() : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            var docker = new dockerode();
            await this.checkDockerImage(docker).then(async (result) => {
                this.imageExists = true;
                Log.i("The image has already been pulled. Expected true. Got: " + result);
            }).catch(async (result: any) => {
                this.imageExists = false;
                Log.i("The image has not been pulled. Expected false.  Got:" + result);
            });
            if (!this.imageExists) {
                const promptToPull = await vscode.window.showWarningMessage(Translator.getString("wizard.promptToPullImage"), {modal : true}, Translator.getString("wizard.yes"));
                if (promptToPull === Translator.getString("wizard.yes")) {
                    await vscode.window.withProgress({
                        location: vscode.ProgressLocation.Notification,
                        title: Translator.getString("wizard.pullingImage"), 
                        cancellable: false}, 
                        async (progress: vscode.Progress<{}>) => {
                            return new Promise((resolve, reject) => {
                                this.pullDockerImage(docker, progress).then(async () => {
                                    await this.doGeneration(progress).then(async () => {
                                        resolve();
                                    }).catch(async () => {
                                        reject();
                                    });
                                }).catch(() => {
                                    reject();
                                });
                            });
                        }
                    );
                } else { // If no to pull image, then return. Perhaps prompt to use Java ?
                    reject("Prompt to pull image was declined"); // For log
                    return;
                }
            } else {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: Translator.getString("wizard.generatorRunning"), 
                    cancellable: false},
                    async (progress: vscode.Progress<{}>) => {
                        return new Promise(async (resolve, reject) => {
                            await this.doGeneration(progress).then(async () => {
                                resolve();
                            }).catch(async () => {
                                reject();
                            });
                        });
                    }
                );
            }
            resolve("");
        });
    }

    protected async gatherOpenApiDefinitions() : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            let selectedFolderContents: Array<dirent>;
            selectedFolderContents = fs.readdirSync(this.localPath.path, { withFileTypes: true });
            var definitions: string[] = [];
            selectedFolderContents.forEach((aFile: dirent) => {
                try {
                    var name = (aFile.name !== null && aFile.name !== undefined) ? aFile.name.toString() : aFile.toString();
                    // Naming convention is openapi.(yaml|json), but let's be flexible.
                    if (fs.lstatSync(this.localPath.path + "/" + name).isFile() && this.isPotentialOpenApiFile(name))  {
                        definitions.push(name);
                    } else { // folders for output locations
                        if (fs.lstatSync(this.localPath.path + "/" + name).isDirectory() && !name.startsWith('.')) {
                            if (name === this.preferredSourceLocation) {
                                this.childSourceFolderToAppend = "/" + name;
                            }
                            this.getAllOpenApiDefinitions(vscode.Uri.parse(this.localPath.toString() + "/" + name), definitions);
                        }
                    }
                } catch (error) {
                    reject("Error retrieving OpenAPI definitions from the project: " + error); // For Log
                    return;
                }
            });
            if (definitions.length === 0) {
                vscode.window.showErrorMessage(Translator.getString("wizard.errorNoDefinitions"));
                reject("There are no OpenAPI definitions in the project/folder");
                return;
            }
            // ****** Generator Option *********
            this.selectedDefinition = "";
            // *********************************
            const tempFileSelected = await vscode.window.showQuickPick(definitions, Constants.QUICK_PICK_OPTION_OPENAPI_DEFINITIONS);
            Log.i("Selected Definition: " + tempFileSelected);
            if (tempFileSelected === undefined) {
                reject("Definition is undefined"); // For log
                return;
            } else {
                this.selectedDefinition = tempFileSelected;
            }
            if (this.selectedDefinition === "") { // cancelled
                reject("Definition is empty"); // For log
                return;
            }
            this.fqPathToDefinition = this.localPath.path;
            resolve();
        });
    }

    protected async enableProgressReporter(progress: vscode.Progress<{}>) : Promise<Stream> {
        var outStr : Stream = new Stream.PassThrough();
        return new Promise<Stream>(async (resolve) => {
            outStr.on('data', async (data: any) => {
                const result: string = data.toString();
                Log.i(`${result}`);
                var index = result.indexOf('writing file'); // Do not externalize to resource file
                if (index > 0) {
                    progress.report({ message: result.substr(index)});
                } else {
                    progress.report({ message: `${result}` });  
                }
            });
            resolve(outStr);
        });
    }

    private isPotentialOpenApiFile(name: string) : boolean {
        return ((name.toLowerCase().endsWith('yaml') || name.toLowerCase().endsWith('yml') || name.toLowerCase().endsWith('json'))
            && name.toLowerCase() !== 'package.json'  // Filter out specific files
            && name.toLowerCase() !== 'package-lock.json'
            && name.toLowerCase() !== 'chart.yaml'
            && name.toLowerCase() !== 'nodemon.json'
            && name.toLowerCase() !== 'manifest.yml'
            && name.toLowerCase() !== 'devfile.yaml');
    }

    private async getAllOpenApiDefinitions(uri: vscode.Uri, definitions: string[]) {
        let selectedFolderContents: Array<dirent>;
        selectedFolderContents = fs.readdirSync(uri.path, { withFileTypes: true });
        selectedFolderContents.forEach((aFile: dirent) => {
            try {
                var name = (aFile.name !== null && aFile.name !== undefined) ? aFile.name.toString() : aFile.toString();
                if (fs.lstatSync(uri.path + "/" + name).isFile() && this.isPotentialOpenApiFile(name))  {
                    var relativePathToProj = uri.toString().replace(this.localPath.toString(), "");
                    definitions.push(relativePathToProj + "/" + name);
                } else { // folders for output locations
                    if (fs.lstatSync(uri.path + "/" + name).isDirectory() && !name.startsWith('.')) {
                        this.getAllOpenApiDefinitions(vscode.Uri.parse(uri.toString() + "/" + name), definitions);
                    }
                }
            } catch (error) {
                Log.e("Error retrieving OpenAPI definitions from the project: " + error);
            }
        });
    }

}