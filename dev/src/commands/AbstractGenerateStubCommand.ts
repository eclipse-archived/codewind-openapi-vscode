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
import Utils from '../util/Utils';
import AbstractGenerateCommand from './AbstractGenerateCommand';
import Translator from '../constants/Translator';
import PomUtilities from '../util/PomUtilities';
var dockerode = require('dockerode');
var fs = require('fs');
var reqPath = require('path');
var copydir = require('copy-dir');

export default abstract class AbstractGenerateStubCommand extends AbstractGenerateCommand {

    protected abstract quickPickOptionGeneratorTypes: vscode.QuickPickOptions;
    
    // Go
    protected abstract goTypes : string[];
    // Java - Lagom, MP/JEE, Spring
    protected abstract javaTypes : string[];
    protected abstract javaSpringTypes : string[];

    protected abstract codewindTypes : string[];  // Codewind specific

    // Node
    protected abstract nodeTypes : string[];
    // Python
    protected abstract pythonTypes : string[];
    // Swift
    protected abstract swiftTypes : string[];
   
    constructor(_generatorType: string) {
        super(_generatorType);
    }

    private pomFileExists : boolean = false;
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

        var currentGeneratorTypes: string [] = [];
    
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
                await this.promptForOpenApiDefinition();
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
                        break;
                    case "java":
                    case "Java":
                        if ("spring" === this.projectType) {
                            currentGeneratorTypes = this.javaSpringTypes;
                        } else if (this.projectType.toLowerCase().indexOf("liberty") >= 0 ||
                                this.projectType.toLowerCase().indexOf("docker") >= 0) {
                            currentGeneratorTypes = this.codewindTypes;
                        } else if (this.projectType.toLowerCase().indexOf("appsodyExtension") >= 0) { // appsodyExtension
                            currentGeneratorTypes = this.codewindTypes;
                            currentGeneratorTypes = this.javaTypes.concat(this.javaSpringTypes);
                        } else { // Default to any java and spring types
                            currentGeneratorTypes = this.javaTypes;
                            currentGeneratorTypes = this.javaTypes.concat(this.javaSpringTypes);
                        }
                        break;
                    case "nodejs":
                    case "Node.js":
                        currentGeneratorTypes = this.nodeTypes;
                        break;
                    case "swift":
                    case "Swift":
                        currentGeneratorTypes = this.swiftTypes;
                        this.preferredSourceLocation = "/Sources";
                        break;
                    case "python":
                    case "Python":
                        currentGeneratorTypes = this.pythonTypes;
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
                var response = await this.getOutputLocation();

                this.pomFileExists = await fs.existsSync(this.localPath.fsPath + "/pom.xml");
                // If the selected output location already contains generated files, then it is not necessary
                // to back up the pom.xml if applicable
                var fileToBeMerged = "";
                // Skip pre-code gen if ignore file exists already.  If code generation has already been performed in the project,
                // then the merge should have already taken place.  There is no need to merge again.
                // If output location is the same as the project root, then back up the original pom.xml
                if (this.selectedUriFolder.fsPath === this.localPath.fsPath &&
                    response !== Constants.OPENAPI_GENERATOR_IGNORE_FILE_EXISTS) {
                    // Knowing the 'Codewind' project type ONLY is not sufficient.  We must check whether a specific
                    // file exists.
                    // Check for an existing pom.xml and then back it up
                    var msgToShow = "wizard.existingFilesWarning";
                    if (this.projectType === "spring") {
                        msgToShow = "wizard.existingFilesWarningForSpring";
                    }
                    fileToBeMerged = await Utils.backupFileIfExists(this.localPath.fsPath, "pom", ".xml", msgToShow);
                }
                //////////////////////////////////////////////////////////
                // Workaround for Java spring server generator only
                //////////////////////////////////////////////////////////
                var templatePath = reqPath.join(__dirname, '/../templates/JavaSpring401');
                if (this.selectedGeneratorType === "spring") {
                    fs.mkdirSync(this.selectedUriFolder.fsPath + "/.cwopenapitemplates");
                    await copydir.sync(templatePath, this.selectedUriFolder.fsPath + "/.cwopenapitemplates");
                }
                // End of workaround /////////////////////////////////////
                Log.i("****** About to call generator");
                await this.callGenerator();
                // Do post code gen config if chosen output location is at the project's root.
                // Skip post-code gen if ignore file exists already.  If code generation has already been performed in the project,
                // then the merge should have already taken place.  There is no need to merge again.
                if (this.selectedUriFolder.fsPath === this.localPath.fsPath && 
                    response !== Constants.OPENAPI_GENERATOR_IGNORE_FILE_EXISTS && 
                    this.pomFileExists &&
                    fileToBeMerged.length > 0) {
                    await PomUtilities.postCodeGenPomConfiguration(this.localPath.fsPath, fileToBeMerged, true);

                }            
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
            this.preferredSourceLocation = "/Sources";
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
            var cmdLineArgs : String[];
            
            //////////////////////////////////////////////////////////
            // Workaround for Java spring server generator only
            //////////////////////////////////////////////////////////
            if (this.selectedGeneratorType === "spring") {
                var filePath = this.localPath.fsPath;
                cmdLineArgs = ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', this.selectedGeneratorType, '--enable-post-process-file', '-t', "/out/.cwopenapitemplates/", '-o', '/out'];
                if (this.pomFileExists) {
                    cmdLineArgs.push('--additional-properties');
                    cmdLineArgs.push('mavenPomExists=true');
                    Log.i("CmdLineArgs is " + cmdLineArgs.toString());
                    // cmdLineArgs = ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', this.selectedGeneratorType, '--enable-post-process-file', '-java8', '-t', "/out/.cwopenapitemplates/", '-o', '/out', '--additional-properties', 'mavenPomExists=true'];
                    Log.i("Mapped gen command is " + 'generate  -i /gen/' + this.selectedDefinition + ' -g ' + this.selectedGeneratorType + ' -t ' + "/out/.cwopenapitemplates/" + ' -o /out -v ' + this.fqPathToDefinition + ':/gen' + " -v " + this.fqPathOutputLocation +':/out --additional-properties mavenPomExists=true');
                } else {
                    // cmdLineArgs = ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', this.selectedGeneratorType, '--enable-post-process-file', '-java8', '-t', "/out/.cwopenapitemplates/", '-o', '/out'];
                    Log.i("Mapped gen command is " + 'generate  -i /gen/' + this.selectedDefinition + ' -g ' + this.selectedGeneratorType + ' -t ' + "/out/.cwopenapitemplates/" + ' -o /out -v ' + this.fqPathToDefinition + ':/gen' + " -v " + this.fqPathOutputLocation +':/out');
                }
            } else {
                cmdLineArgs = ['generate', '-i', '/gen/' + this.selectedDefinition, '-g', this.selectedGeneratorType, '--enable-post-process-file', '-o', '/out'];
                Log.i("Mapped gen command is " + 'generate -i /gen/' + this.selectedDefinition + ' -g ' + this.selectedGeneratorType + ' -o /out -v ' + this.fqPathToDefinition + ':/gen' + " -v " + this.fqPathOutputLocation +':/out');
            }
            // End of workaround /////////////////////////////////////
            await docker.run(
                "openapitools/openapi-generator-cli:v4.0.1", 
                cmdLineArgs,
                outStr,
                {HostConfig: {"Binds": [`${this.fqPathToDefinition}:/gen`, `${this.fqPathOutputLocation}:/out`] }},
                {},
                async (err : any, data: any, ctnr: any) => {
                    try {
                        ctnr.remove();
                        //////////////////////////////////////////////////////////
                        // Workaround for Java spring server generator only
                        // Remove when template code is fixed in openapi-generator                        
                        if (this.selectedGeneratorType === "spring") {
                            Utils.removeDir(this.selectedUriFolder.fsPath + "/.cwopenapitemplates");
                        }
                        // End of workaround /////////////////////////////////////
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
                    } catch (e) {
                        reject();
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
