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
import Log from '../util/Logger';
import AbstractGenerateCommand from './AbstractGenerateCommand';
import Translator from '../constants/Translator';
var dockerode = require('dockerode');

export default abstract class AbstractGenerateStubCommand extends AbstractGenerateCommand {

    protected abstract quickPickOptionGeneratorTypes: vscode.QuickPickOptions;
    
    // Go
    protected abstract goTypes : string[];
    // Java - Lagom, MP/JEE, Spring
    protected abstract javaTypes : string[];
    // Node
    protected abstract nodeTypes : string[];
    // Python
    protected abstract pythonTypes : string[];
    // Swift
    protected abstract swiftTypes : string[];
   
    constructor(_generatorType: string) {
        super(_generatorType);
    }

    private selectedGeneratorType: string = "";

    public async generate(selection: vscode.TreeItem | undefined) : Promise<void> {
        // reset values before generation
        this.projectLanguage = "";
        this.selectedGeneratorType = "";

        this.projectName = "";
        this.localPath = vscode.Uri.parse("file://");
        this.imageExists = false;

        this.selectedDefinition = "";
        this.fqPathToDefinition = "";
        this.fqPathOutputLocation = "";
        this.childSourceFolderToAppend = "";

        var currentGeneratorTypes: string [] = [];
        var preferredSourceLocation: string;
    
        try {
            // Check if the command is launched from codewind's view and the context is a known Microclimate project
            if (selection !== undefined) {
                await this.analyzeSelection(selection);
            }
            // If there is no project context then prompt for target project and target language
            if (this.projectName === "") {
                await this.promptForProject();
            }
            // scan the project for OpenAPI definitions
            if (this.projectName !== "") {
                await this.gatherOpenApiDefinitions();
                if (this.projectLanguage === "" || this.projectLanguage === "unknown") { // If project language is still not determined, we must prompt the user
                    var langTypeMap = Constants.ALL_CLIENT_LANGUAGES;
                    if (this._generatorType === "server") {
                        langTypeMap = Constants.ALL_SERVER_LANGUAGES;
                    }
                    var allLangs : string [] = [];
                    var len = langTypeMap.length;
                    for (var idx : number = 0; idx < len; idx++) {
                        var a : string = langTypeMap[idx][0];
                        allLangs.push(a);
                    }
                    await vscode.window.showQuickPick(allLangs, Constants.QUICK_PICK_OPTION_LANGUAGES).then(async (selectedLanguage: string | undefined) => {
                        if (selectedLanguage === undefined) {
                            return;
                        }
                        this.projectLanguage = selectedLanguage;
                    });                
                }

                switch (this.projectLanguage) {
                    case "go":
                    case "Go":
                        currentGeneratorTypes = this.goTypes;
                        preferredSourceLocation = ".";
                        break;
                    case "java":
                    case "Java":
                        currentGeneratorTypes = this.javaTypes;
                        preferredSourceLocation = "src";
                        break;
                    case "nodejs":
                    case "Node.js":
                        currentGeneratorTypes = this.nodeTypes;
                        preferredSourceLocation = ".";
                        break;
                    case "swift":
                    case "Swift":
                        currentGeneratorTypes = this.swiftTypes;
                        preferredSourceLocation = "Sources";
                        break;
                    case "python":
                    case "Python":
                        currentGeneratorTypes = this.pythonTypes;
                        preferredSourceLocation = ".";
                        break;
                    default:
                        var langs = Constants.ALL_CLIENT_LANGUAGES;
                        if (this._generatorType === "server") {
                            langs = Constants.ALL_SERVER_LANGUAGES;
                        }
                        var numOfLangs = langs.length;
                        for (var inde : number = 0; inde < numOfLangs; inde++) {
                            var l : string = langs[inde][0];
                            if (l === this.projectLanguage) {
                                currentGeneratorTypes = langs[inde][1];
                                break;
                            }
                        }
                }
                if (currentGeneratorTypes.length === 0) {
                    vscode.window.showInformationMessage(Translator.getString("codeGen.infoNoGeneratorTypes", this._generatorType, this.projectLanguage));
                    return;
                }
                // ******* Generator Option ***********
                this.selectedGeneratorType = "";
                // ************************************   
                if (currentGeneratorTypes.length === 1) {
                    this.selectedGeneratorType = currentGeneratorTypes[0];
                } else {
                    await vscode.window.showQuickPick(currentGeneratorTypes, this.quickPickOptionGeneratorTypes).then(async (tempSelectedGeneratorType: string | undefined) => {
                        Log.i("Generator type selected: " + tempSelectedGeneratorType);
                        if (tempSelectedGeneratorType === undefined) {
                            return;
                        }
                        this.selectedGeneratorType = tempSelectedGeneratorType;   
                    });
                    if (this.selectedGeneratorType === "") {
                        return;
                    }
                }
                // Target source folder may be specific to project type (eg. 'Sources' folder for Swift)                
                await this.getOutputLocation();
                await this.callGenerator();
            }
        } catch (error) {  // Catch for all expected rejected promises or cancelled quick picks or inputs
            Log.i("Code generation stopped or failed. " + error);
        }
    }

    protected async analyzeSelection(selection: vscode.TreeItem) {
        super.analyzeSelection(selection);
        if (Reflect.has(selection, "type")) {
            this.projectLanguage = Reflect.get(selection, "type").language;
        }
        Log.i("Selected project language is: " + this.projectLanguage);

        if (this.projectLanguage === "swift") {
            this.preferredSourceLocation = "Sources";
        }
        if (this.projectLanguage === 'unknown') {
            this.projectLanguage = "";
            await this.determineLanguage();
        }
    }

    protected async doGeneration(progress: vscode.Progress<{}>) : Promise<void> {
        return new Promise<void>(async (resolve, reject) =>  {        
            var docker = new dockerode();
            var outStr = await this.enableProgressReporter(progress);
            Log.i("Mapped gen comamnd is " + 'generate -i /gen/' + this.selectedDefinition + ' -g ' + this.selectedGeneratorType + ' -o /out -v ' + this.fqPathToDefinition + ':/gen' + " -v " + this.fqPathOutputLocation +':/out');
            await docker.run(
                "openapitools/openapi-generator-cli:v4.0.1",
                ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', this.selectedGeneratorType, '-o', '/out'],
                outStr,
                {HostConfig: {"Binds": [`${this.fqPathToDefinition}:/gen`, `${this.fqPathOutputLocation}:/out`] }},
                {},
                async (err : any, data: any, ctnr: any) => {
                    ctnr.remove();
                    if (err) {
                        Log.e("docker.run error is: " + err);
                        vscode.window.showErrorMessage(Translator.getString("codeGen.failedToGenerateStub", this.selectedGeneratorType , err));
                        reject();
                    } else {
                        if (data !== null) {
                            Log.i("data.StatusCode = " + data.StatusCode);
                            Log.i("data.Error = " + data.Error);
                            if (data.StatusCode === 0) {
                                vscode.window.showInformationMessage(Translator.getString("codeGen.success", this.selectedGeneratorType));
                                resolve();                       
                            } else { // Other issues?
                                vscode.window.showInformationMessage(Translator.getString("codeGen.failedNonZeroStatus", this.selectedGeneratorType, data.StatusCode, data.Error));   
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

    private async determineLanguage() {
        if (this.projectLanguage === "") { // If project language is still not determined, we must prompt the user
            var langTypeMap = Constants.ALL_CLIENT_LANGUAGES;
            if (this._generatorType === "server") {
                langTypeMap = Constants.ALL_SERVER_LANGUAGES;
            }            
            var allLangs : string [] = [];
            var len = langTypeMap.length;
            for (var idx : number = 0; idx < len; idx++) {
                var a : string = langTypeMap[idx][0];
                allLangs.push(a);
            }
            await vscode.window.showQuickPick(allLangs, Constants.QUICK_PICK_OPTION_LANGUAGES).then((selectedLanguage: string | undefined) => {
                if (selectedLanguage === undefined) {
                    return;
                }
                this.projectLanguage = selectedLanguage;
            });                
        }
    }
}
