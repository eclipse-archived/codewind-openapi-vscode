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
import * as assert from 'assert';
import PomUtilities from '../util/PomUtilities';
var fs = require('fs');
var REQPATH = require('path');

suite("POM Utilities Tests", function () {

    async function compareFiles(pathOfPom : any) {
        var expected = await fs.readFileSync(pathOfPom + '/pom-merged-expected.xml');
        var actual = await fs.readFileSync(pathOfPom + '/pom.xml');
        var isEqual = await expected.equals(actual);
        assert.equal(isEqual, true, "Test merged pom contents");
    }

    // Server Stub, jaxrs-spec generator
    test("Server, jaxrs-spec, with bare pom.xml", async function() {
        const testPath = "/pomfiles/server/jaxrs-spec/anyMavenProjectTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
        // var expected = await fs.readFileSync(pathOfPom + '/pom-merged-expected.xml');
        // var actual = await fs.readFileSync(pathOfPom + '/pom.xml');
        // var isEqual = await expected.equals(actual);
        // assert.equal(isEqual, true, "Test merged pom contents");
    });

    test("Server, jaxrs-spec, with codewind MicroProfile pom.xml", async function() {
        const testPath = "/pomfiles/server/jaxrs-spec/codewindMicroProfileTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
    });

    test("Server, jaxrs-spec, with codewind Open Liberty Docker pom.xml", async function() {
        const testPath = "/pomfiles/server/jaxrs-spec/codewindOpenLibertyDockerTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
    });

    // Server Stub, spring generator
    test("Server, spring, with codewind spring pom.xml", async function() {
        const testPath = "/pomfiles/server/spring/codewindSpringBootTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
    });

    test("Server, spring, with appsody spring boot pom.xml", async function() {
        const testPath = "/pomfiles/server/spring/appsodySpringBootTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
    });

    // Client Stub, java generator

    test("Client, java, with codewind Open Liberty Docker pom.xml", async function() {
        const testPath = "/pomfiles/client/java/codewindOpenLibertyDockerTest01";
        var pathOfPom = REQPATH.join(__dirname, testPath);
        await PomUtilities.postCodeGenPomConfiguration(pathOfPom, 'pom-orig.xml', false);
        compareFiles(pathOfPom);
    });

    // Client Stub, jaxrs-cxf-client generator

});