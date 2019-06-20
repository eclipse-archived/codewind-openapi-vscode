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
import Log from "../util/Logger";

var fs = require('fs');

class Translator {
    private jsonObject : any;

    constructor() {
        var contents = fs.readFileSync(__dirname + "/Strings.json");
        this.jsonObject = JSON.parse(contents);
    }

    public getString(key: string, data?: string[]) : string {
        var obj: string = this.getProperty(this.jsonObject, key);
        
        if (obj) {
            if (data) {
                for (var i = 0; i < data.length; i++ ) {
                    obj = obj.replace("{" + i + "}", data[i]);
                }    
            }
            return obj;
        } else {
            Log.e("String " + key + " is not found in the string resource file");
        }
        return "";
    }

    private getProperty(obj: any, path: string) {
        var keys = path.split('.');
        for (var i = 0; i < keys.length; i++) {
            if (!obj.hasOwnProperty(keys[i])) {
                return;
            }
            obj = obj[keys[i]];
        }    
        return obj;
    }
}

var translator : Translator = new Translator();

function init() {
    translator = new Translator();
}

function getString(key: string, ...replacement: string[]) : string {
    return translator.getString(key, replacement);
}

export default {
    init,
    getString
}