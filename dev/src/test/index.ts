/*******************************************************************************
 * Copyright (c) 2019, 2020 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v2.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v20.html
 *
 * Contributors:
 *     IBM Corporation - initial API and implementation
 *******************************************************************************/
// Adapted from https://github.com/microsoft/vscode-extension-samples/blob/master/helloworld-test-sample/src/test/suite/index.ts

import Mocha from "mocha";
import * as path from "path";

// tslint:disable: no-console

const SUITES_TO_RUN = [
    "POMUtilitiesTests.js"
]
.map((suite) => path.join(__dirname, "suites", suite));

export async function run(): Promise<void> {

    const mocha = new Mocha({
        ui: "bdd",
        useColors: true,
        reporter: "spec",
        fullStackTrace: true,
        slow: 2500,
        timeout: 5000,
    });

    SUITES_TO_RUN.forEach((suite) => mocha.addFile(suite));

    return new Promise<void>((cb, e) => {
        try {
            mocha.run((failures) => {
                if (failures > 0) {
                    return e(`${failures} tests failed.`);
                }
                cb();
            });
        }
        catch (ex) {
            console.error(ex);
            return e(ex);
        }
    });
}