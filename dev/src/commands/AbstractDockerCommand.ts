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

/*
 * Base Docker Command 
 */
export default abstract class AbstractDockerCommand {

    protected imageExists : boolean = false;
    protected openapiGeneratorImage : string = "openapitools/openapi-generator-cli:v4.2.2";

    protected async checkDockerImage(docker: any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {
            var opts = {"filters": '{"reference": ["' + this.openapiGeneratorImage + '"]}'};
            Log.i("Calling docker.listImages()");    
            await docker.listImages(opts, function(error: NodeJS.ErrnoException, addresses: string[]) {
                Log.i("docker.listImages() error is " + error);
                if (error === null) {
                    if (addresses && addresses.length > 0) {
                        try {
                            Log.i("First image is: " + JSON.stringify(addresses[0]));
                        } catch (e) {
                            // Ignore
                        }
                        resolve(true);
                    } else {
                        reject(false);
                    }
                } else {
                    reject(false);
                }
            });
        });
    }

    protected async pullDockerImage(docker: any, progress: vscode.Progress<{}>): Promise<boolean> {
        Log.i("Calling docker.checkAuth()");
        // Check auth first.  Should be successful.          
        var authCheck = await this.checkAuth(docker).then(async (result : boolean) : Promise<boolean> => {
            Log.i("Resulting Auth is: " + result);
            return true;
        }).catch(async (result: boolean) => {
            Log.i("Resulting Auth is: " + result);
            return false;
        });
        Log.i("Calling docker.pull() after authCheck: " + authCheck);
        return new Promise<boolean>(async (resolve, reject) => {
            await docker.pull(this.openapiGeneratorImage, async (error: any, streamo: any) => {
                // Log the output of pull.
                // streamo.on('data', (d: any) => {
                //    Log.i(d.toString());
                // });
                Log.i("Docker pull error: " + error);
                docker.modem.followProgress(streamo, async (er: any, output: any) => {
                    // onFinished() callback
                    // Seems to be the only way to 'wait' until the image is finished pulling
                    // prior to invoking code gen
                    if (er) {
                        Log.e("docker.pull error = " + er);
                        reject();
                    } else {
                        Log.i("docker.pull has no error");
                    }
                    output.forEach((a: any) => {
                        if (a) {
                            // Log.i(JSON.stringify(a));            
                        }
                    });
                    if (er === null) {
                        // this.doGeneration();
                        resolve();
                    } else {
                        Log.e("Docker pull error: " + er);
                        reject();
                    }
                }, async (event: any) => {
                    // onProgress() callback            
                    progress.report({ message: event.status });
                });

            });
        });
    }

    private async checkAuth(docker: any): Promise<boolean> {
        return new Promise<boolean>(async function (resolve, reject) {
            await docker.checkAuth({serveraddress: 'https://index.docker.io/'}, async (err: any, responseSchema: any) => {
                // To track auth progress
                // docker.modem.followProgress(responseSchema, onFinished, onProgress);
                // function onFinished(err: any, output: any) {
                // }
                // function onProgress(event: any) {
                // }
                // // OR 
                // docker.modem.followProgress(responseSchema, (err: any, output: any) => {
                //     // onFinished
                // }, (event: any) => {
                //     // onProgress
                // });
                try {
                    if (responseSchema !== null) {
                        Log.i("IdentityToken:" + responseSchema.IdentityToken);
                        Log.i("Status:" + responseSchema.Status);
                    }    
                } catch (e) {
                    // Ignore
                }
                if (responseSchema.Status === "Login Succeeded" || err === null) {
                    resolve(true);
                }
                if (err !== null) {
                    Log.e("Checking authentication to dockerhub server failed.");
                    Log.e("- Reason:" + err.reason);
                    Log.e("- StatusCode:" + err.statusCode);
                    Log.e("- Message:" + err.json.message);
                }
                reject(false);
            });
        });
    }
}