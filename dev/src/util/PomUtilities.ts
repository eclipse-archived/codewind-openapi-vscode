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
import Log from '../util/Logger';
import Utils from '../util/Utils';
var fs = require('fs');
var X2J = require('fast-xml-parser');
var J2X = require("fast-xml-parser").j2xParser;

export default class PomUtilities {

    // doAsyncWrite: true, unless for tests, where the assertion must take place after the merged pom has been written.
    public static async postCodeGenPomConfiguration(filePath: any, originalFile: string, doAsyncWrite: boolean) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            try {
                // var filePath = this.localPath.fsPath;        
                var options = {
                    attributeNamePrefix : "",
                    attrNodeName: "@attr",
                    textNodeName : "#text",
                    ignoreAttributes : false,
                    ignoreNameSpace : false,
                    allowBooleanAttributes : false,
                    parseNodeValue : false,
                    parseAttributeValue : false,
                    trimValues: true,
                    cdataTagName: "__cdata",
                    cdataPositionChar: "\\c",
                    localeRange: "",
                    parseTrueNumberOnly: false,
                    attrValueProcessor: (val: any) => {return val;},
                    tagValueProcessor: (val: any) => {return val;},
                    stopNodes: ["codewind-parse-stop"]
                };
                var generatedFile = await Utils.getUniqueFileName(filePath, "pom-generated", ".xml");
                // Code gen just occurred so the pom.xml now is from the generator.
                await fs.renameSync(filePath + "/pom.xml", filePath + "/" + generatedFile);
                var xmlData = fs.readFileSync(filePath + "/" + originalFile, "utf8");                    
                if (xmlData) {
                    var origPomJsonObject = X2J.parse(xmlData, options);
                    var genPomJsonObject = undefined;
                    if (await fs.existsSync(filePath + "/" + generatedFile)) {
                        var generatedPom = fs.readFileSync(filePath + "/" + generatedFile, "utf8");
                        if (generatedPom) {
                            genPomJsonObject = X2J.parse(generatedPom, options);
                        }
                    }
                    // If we have a valid pom object for both, then proceed
                    if (origPomJsonObject && genPomJsonObject) {
                        try {
                            // Merge properties
                            await PomUtilities.mergeProperties(origPomJsonObject, genPomJsonObject);
                            // Merge dependencies
                            await PomUtilities.mergeDependencies(origPomJsonObject, genPomJsonObject);
                            // Merge build plugins
                            await PomUtilities.mergeBuildPlugins(origPomJsonObject, genPomJsonObject);

                        } catch (e) {
                            Log.e(e);
                            // If any of the above merge steps fail, reject
                            reject(false);
                        }
                        var defaultOptions = {
                            attributeNamePrefix : "",
                            attrNodeName: "@attr", //default is false
                            textNodeName : "#text",
                            ignoreAttributes : false,
                            cdataTagName: "__cdata", //default is false
                            cdataPositionChar: "\\c",
                            format: true,
                            indentBy: "  ",
                            supressEmptyNode: false
                        };
                        var parser = new J2X(defaultOptions);
                        var xml = parser.parse(origPomJsonObject);
                        // Asynchronous, unless for tests, where the assertion must take place after the merged pom has been written.
                        // Also add the XML declaration
                        if (doAsyncWrite) {
                            await fs.writeFile(filePath + "/pom.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml, async function(err: any, data: any) {
                                if (err) {
                                    console.log(err);
                                    reject(false);
                                }
                                else {
                                    if (data) {
                                        console.log('updated!' + data);
                                    } else {
                                        console.log('Pom.xml successfully merged');
                                    }
                                }
                            });    
                        } else { // For test cases only
                            try {
                                await fs.writeFileSync(filePath + "/pom.xml", "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + xml);
                                console.log('Pom.xml successfully merged');
                            } catch (err) {
                                console.error(err);
                                resolve(false);
                            }
                        }
                        resolve(true);
                    }
                }
            } catch(ex) {
            //
            }
        });
    }

    private static async mergeProperties(origPomJsonObject: any, genPomJsonObject: any) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) =>  {
            try {
                var aProperties = origPomJsonObject.project.properties;
                var bProperties = genPomJsonObject.project.properties;
                if (aProperties === undefined) {
                    origPomJsonObject.project["properties"] = {};
                }                    
                for (var bProperty in bProperties) {
                    var alreadyInA : boolean = false;
                    for (var aProperty in aProperties) {
                        if (aProperty === bProperty) {
                            alreadyInA = true;
                            break;
                        }
                    }
                    if (!alreadyInA) {
                        if (aProperties) {
                            aProperties[bProperty] = bProperties[bProperty];
                        } else {
                            origPomJsonObject.project.properties[bProperty] = bProperties[bProperty];
                        }
                    }                            
                }    
            } catch (e) {
                Log.e(e);
                reject(false);
            }
            resolve(true);
        });
    }

    private static async mergeDependencies(origPomJsonObject: any, genPomJsonObject: any) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) =>  {
            try {
                if (origPomJsonObject.project.dependencies === undefined) {
                    origPomJsonObject.project["dependencies"] = {};
                    origPomJsonObject.project.dependencies["dependency"] = [];
                }
                // Consider case where dependencies is defined but empty
                if (origPomJsonObject.project.dependencies.dependency === undefined) {
                    origPomJsonObject.project.dependencies["dependency"] = [];
                }
                // Let A be the dependency of the original
                // Let B be the dependency of the generated
                var a = origPomJsonObject.project.dependencies.dependency;
                var b = genPomJsonObject.project.dependencies.dependency;

                // Can be only one dependency under dependencies.  If it is, it won't be an array of objects.
                // We need to convert it to an array so we can add the dependencies from the generated pom.
                if (!Array.isArray(a)) {
                    var result = [];
                    result.push(origPomJsonObject.project.dependencies.dependency);
                    origPomJsonObject.project.dependencies["dependency"] = result;
                    a = origPomJsonObject.project.dependencies.dependency; // a is now an array
                }
                var alreadyInA : boolean = false;
                // Similarly, if there is only one dependency in B, then it is not an array
                if (!Array.isArray(b)) {
                    alreadyInA = false;
                    for (var aDep of a) {
                        if (b.groupId === aDep.groupId &&
                            b.artifactId === aDep.artifactId) {
                            alreadyInA = true;
                            break;
                        }
                    }
                    if (!alreadyInA) {
                        origPomJsonObject.project.dependencies.dependency.push(b);
                    }                                                  
                } else { // Expected generated POM B has more than one of these elements to add to A
                    for (var bDep of b) { // Iterate each one and check if it is already in A
                        alreadyInA = false;
                        for (const aDep of a) {
                            if (bDep.groupId === aDep.groupId &&
                                bDep.artifactId === aDep.artifactId) {
                                alreadyInA = true;
                                break;
                            }
                        } 
                        if (!alreadyInA) {
                            origPomJsonObject.project.dependencies.dependency.push(bDep);
                        }                                                  
                    }    
                }
            } catch (e) {
                Log.e(e);
                reject(false);
            }
            resolve(true);
        });
    }

    private static async mergeBuildPlugins(origPomJsonObject: any, genPomJsonObject: any) : Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) =>  {
            try {
                if (origPomJsonObject.project.build === undefined) {
                    origPomJsonObject.project["build"] = {};
                    origPomJsonObject.project.build["plugins"] = {};
                    origPomJsonObject.project.build.plugins["plugin"] = [];
                }
                // Consider case where build is defined but empty
                if (origPomJsonObject.project.build.plugins === undefined) {
                    origPomJsonObject.project.build["plugins"] = {};
                    origPomJsonObject.project.build.plugins["plugin"] = [];
                }
                // Let A be the plugin of the original
                // Let B be the plugin of the generated
                var a = origPomJsonObject.project.build.plugins.plugin;
                var b = genPomJsonObject.project.build.plugins.plugin;
                // Can be only one plugin under dependencies.  If it is, it won't be an array of objects.
                // We need to convert it to an array so we can add the plugin from the generated pom.
                if (!Array.isArray(a)) {
                    var result = [];
                    result.push(origPomJsonObject.project.build.plugins.plugin);
                    origPomJsonObject.project.build.plugins["plugin"] = result;
                    a = origPomJsonObject.project.build.plugins.plugin; // a is now an array
                }
                var alreadyInA : boolean = false;
                // Similarly, if there is only one dependency in B, then it is not an array
                if (!Array.isArray(b)) {
                    alreadyInA = false;
                    for (var aPlugin of a) {
                        if (b.groupId === aPlugin.groupId &&
                            b.artifactId === aPlugin.artifactId) {
                            alreadyInA = true;
                            break;
                        }
                    }
                    if (!alreadyInA) {
                        origPomJsonObject.project.build.plugins.plugin.push(b);
                    }                                                  
                } else { // Expected generated POM B has more than one of these elements to add to A
                    for (var bPlugin of b) {
                        alreadyInA = false;
                        for (const aPlugin of a) {
                            if (bPlugin.groupId === aPlugin.groupId &&
                                bPlugin.artifactId === aPlugin.artifactId) {
                                alreadyInA = true;
                                break;
                            }
                        } 
                        if (!alreadyInA) {
                            origPomJsonObject.project.build.plugins.plugin.push(bPlugin);
                        }                                                  
                    }    
                }
            } catch (e) {
                Log.i(e);
                reject(false);
            }
            resolve(true);
        });
    }
}
