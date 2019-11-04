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
import Translator from '../constants/Translator';
var fs = require('fs');
var reqPath = require('path');

export default class Utils {

    public static async getUniqueFileName(filePath: string, proposedBackupName: string, fileExtension: string) : Promise<string> {
        return new Promise<string>(async (resolve, reject) =>  {
            try {
                var i = 0;
                var tempName = proposedBackupName + fileExtension;
                while (fs.existsSync(filePath + "/" + tempName)) {
                    i++;
                    tempName = proposedBackupName + "-" + i  + fileExtension;
                }
                resolve(tempName);
            } catch (e) {
                reject("");
            }
        });
    }

    public static async removeDir(filePath: any) {
        if (fs.existsSync(filePath)) {
            fs.readdirSync(filePath).forEach( async (item: any) => {
                const aPath = reqPath.join(filePath, item);
                if (fs.lstatSync(aPath).isDirectory()) {
                    await this.removeDir(aPath);
                } else { 
                    fs.unlinkSync(aPath);
                }
            });
            fs.rmdirSync(filePath);
        }
    }

    // General method to backup a file.  eg. pom.xml, package.json, or even source code if need be.
    // filePath: vsCode.Uri.fsPath to the resource
    // fileToBackup: name part of the file to backup excluding the extension
    // fileExtension: extension of the file, including the period
    // msgToShow: the Translator.getString key message to inform the user. This should contain only one substitution for the file name
    public static async backupFileIfExists(filePath : any, fileToBackup : string, fileExtension : string, msgToShow : string) : Promise<string>  {
        return new Promise<string>(async (resolve, reject) => {
            if (await fs.existsSync(filePath + "/" + fileToBackup + fileExtension)) {
                await Log.i("Backing up original file " + fileToBackup + fileExtension);
                if (msgToShow.length > 0) {
                    const response = await vscode.window.showWarningMessage(Translator.getString(msgToShow, fileToBackup + fileExtension), {modal : true}, Translator.getString("wizard.yes"));
                    if (response !== Translator.getString("wizard.yes")) {
                        reject("Declined to proceed with code generation when output folder already contains the file " + fileToBackup + fileExtension);
                        return;
                    }    
                }
                var tempName = await Utils.getUniqueFileName(filePath, fileToBackup + "-backup", fileExtension);
                await fs.rename(filePath + "/" + fileToBackup + fileExtension, filePath + "/" + tempName, async (e: any) => {
                    if (e && msgToShow.length > 0) {
                        vscode.window.showInformationMessage(Translator.getString("wizard.failedToBackupFile", fileToBackup + fileExtension, tempName));
                        reject("Failed to backup file:" + fileToBackup + fileExtension);
                    }
                });
                resolve(tempName);
            }
            resolve("");
        });
    }
}