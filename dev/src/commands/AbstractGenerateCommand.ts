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
    protected projectLanguage: string = "";
    protected pathSeparator: string = "";
    protected projectType: string = "";
    protected selectedUriFolder: vscode.Uri = vscode.Uri.parse("file://");

    constructor(protected readonly _generatorType: string) {
        super();
        this.pathSeparator = this.getPathSeparator();
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
            if (Reflect.has(selection, "type")) {
                var typeField = Reflect.get(selection, "type");
                if (Reflect.has(typeField, "internalType")) {
                    this.projectType = Reflect.get(typeField, "internalType");
                }
            }
            Log.i("Selected project is: " + this.projectName);
            Log.i("Selected projectType is: " + this.projectType);
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
                        if (fs.lstatSync(filePath + this.pathSeparator + name).isDirectory() && !name.startsWith('.') && name !== "bin") {
                            folders.push(name);
                            fullFolderPaths.push(wsFolder.uri.fsPath.toString() + this.pathSeparator + name);
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
                    this.localPath = vscode.Uri.file(fullFolderPaths[idx]);
                    this.projectName = selectedFolder;
                });
                if (this.projectName === "") {
                    return;
                }
                var breakForEach = {};
                try {
                    filePath = this.localPath.fsPath;
                    var dotProjectFolder = null;
                    try {
                        dotProjectFolder = fs.readdirSync(filePath + "/../.projects", { withFileTypes: true });
                    } catch (projectError) {
                        // ignore
                    }
                    if (dotProjectFolder) {
                        dotProjectFolder.forEach((projInfFile: dirent) => {
                            var name = (projInfFile.name !== null && projInfFile.name !== undefined) ? projInfFile.name.toString() : projInfFile.toString();
                            var contents = fs.readFileSync(filePath + "/../.projects/" + name);
                            var jsonObject = JSON.parse(contents);
                            if (this.projectName === jsonObject.name) {
                                this.projectLanguage = jsonObject.language;
                                throw breakForEach;
                            }
                        });
                    }
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

    protected async promptForOpenApiDefinition() : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            var openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                defaultUri: this.localPath,
                filters: { [`${Translator.getString("wizard.openApiFilter")}`]: ['yaml', 'yml', 'json'] },
                openLabel: Translator.getString("wizard.promptForDefinition") // Has to be short, for the 'button'
            };
            var selectedFile: vscode.Uri[] = [];
            selectedFile = await vscode.window.showOpenDialog(openDialogOptions).then((tempSelectedFile) => {
                Log.i("Selected OpenAPI Definition is = " + tempSelectedFile);
                if (tempSelectedFile === undefined) {
                    return [];
                }
                return tempSelectedFile;
            });
            if (selectedFile.length === 0) {
                reject("Selected file was not selected.");  // For log
                return;  // Dialog was canceled
            }
            // ***** -i option ***
            this.selectedDefinition = this.getFilenameFromPath(this.localPath.path, selectedFile[0].path);
            // ************************************
            Log.i("Selected file is: " + this.selectedDefinition);
            if (this.selectedDefinition.length === 0) {
                // Do this because the file browser allows users to navigate to locations outside of the workspace
                // and potentially select a file from a different folder. We need to volume mount the project path, 
                // based on the selected project from the previous step during this command flow
                vscode.window.showErrorMessage(Translator.getString("wizard.errorSelectOnlyFromProject", this.localPath.path));
                return;
            }
            if (!this.isPotentialOpenApiFile(this.selectedDefinition)) {
                vscode.window.showErrorMessage(Translator.getString("wizard.errorNotADefinition", this.selectedDefinition));
                return;
            }
            // Mount point
            this.fqPathToDefinition = this.getPlatformPath(this.localPath.path);  // NOT fsPath
            resolve();
        });
    }

    protected async getOutputLocation() : Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            var openDialogOptions: vscode.OpenDialogOptions = {
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                defaultUri: this.preferredSourceLocation.length === 0 ? this.localPath : vscode.Uri.file(this.localPath.fsPath.toString() + this.preferredSourceLocation),
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
            // Do this because the file browser allows users potentially navigate to outside of the workspace
            // and select a file from a different folder.  We need to volume mount this path, from the selected
            // project in the previous step in this command flow
            var isChildFolder = this.isChildFolder(this.localPath.path, selectedWSFolder[0].path);
            if (!isChildFolder) {
                vscode.window.showErrorMessage(Translator.getString("wizard.errorSelectFolderFromProject", this.localPath.path));
                return;
            }
            // ***** -o Generator output option ***
            this.selectedUriFolder = selectedWSFolder[0];
            this.fqPathOutputLocation = this.getPlatformPath(this.selectedUriFolder.path);
            // ************************************   
            try {
                Log.i("Check .openapi-generator-ignore file:" + this.selectedUriFolder.fsPath + this.pathSeparator + ".openapi-generator-ignore");
                if (fs.lstatSync(this.selectedUriFolder.fsPath + this.pathSeparator + ".openapi-generator-ignore").isFile()) {
                    const response = await vscode.window.showWarningMessage(Translator.getString("wizard.promptToOverwrite"), {modal : true}, Translator.getString("wizard.yes"));
                    if (response === Translator.getString("wizard.yes")) {
                        resolve(Constants.OPENAPI_GENERATOR_IGNORE_FILE_EXISTS); // Ok, to continue to generate
                    } else {
                        reject("Overwrite files was declined");  // For log
                    }
                } else {
                    reject("Unexpected folder .openapi-generator-ignore exists."); // It's a folder.  This should not expected
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

    private isChildFolder(initialPath: string, fqPath: string) : boolean {
        var index = fqPath.lastIndexOf(initialPath);
        if (process.platform.toLowerCase().startsWith("win")) {
            index = fqPath.toLowerCase().lastIndexOf(initialPath.toLowerCase());
        }
        return (index === 0);
    }

    private getFilenameFromPath(initialPath: string, fqPath: string) : string {
        if (this.isChildFolder(initialPath, fqPath)) {
            return fqPath.substr(initialPath.length + 1);  // ends with a slash
        }
        return "";
    }

    private getPlatformPath(fqPath: string) : string {
        var adjustedPath = fqPath;
        if (process.platform.toLowerCase().startsWith("win")) {
            if (fqPath.charAt(2) === ':') {
                adjustedPath = fqPath.substr(0, 2) + fqPath.substr(3);
            }
        }
        return adjustedPath;
    }

    private getPathSeparator() : string {
        if (process.platform.toLowerCase().startsWith("win")) {
            return "\\";
        }
        return "/";
    }

    // No built-in way to do content checking
    private isPotentialOpenApiFile(name: string) : boolean {
        var adjustedName = name.toLowerCase();
        if (adjustedName.startsWith('.')
            || adjustedName.endsWith('package.json')
            || adjustedName.endsWith('package-lock.json')
            || adjustedName.endsWith('chart.yaml')
            || adjustedName.endsWith('nodemon.json')
            || adjustedName.endsWith('manifest.yml')
            || adjustedName.endsWith('tslint.json')
            || adjustedName.endsWith('devfile.yaml')) {
            return false;
        }
        return true; // Return true 'blindly' accepting that it is an OpenAPI document
    }
}