/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
const compareVersions = require("compare-versions");
const nls = require("vscode-nls");
const xml2js = require("xml2js");
const localize = nls.loadMessageBundle(__filename);
const sdkName = "Microsoft.DataTools.Schema.Tasks.PostgreSql.Sdk";
;
function checkProjectVersion(minRequiredSDK, maxRequiredSDK, projects, commandObserver) {
    return __awaiter(this, void 0, void 0, function* () {
        let unsupportedProjectsMap = new Array();
        for (let project of projects) {
            let projectFileText = fs.readFileSync(project, 'utf8');
            let projectInfo = readXML(project, projectFileText, commandObserver);
            if (projectInfo) {
                if (!(compareVersions.compare(projectInfo.sdkVersion, minRequiredSDK, '>=') && compareVersions.compare(projectInfo.sdkVersion, maxRequiredSDK, '<='))) {
                    unsupportedProjectsMap.push(projectInfo);
                }
            }
        }
        if (unsupportedProjectsMap.length > 0) {
            promptToUpdateVersion(unsupportedProjectsMap, maxRequiredSDK, commandObserver);
        }
        return Promise.resolve(unsupportedProjectsMap);
    });
}
exports.checkProjectVersion = checkProjectVersion;
function readXML(project, fileText, commandObserver) {
    var parser = new xml2js.Parser();
    let version;
    let referenceType;
    parser.parseString(fileText, function (err, result) {
        if (result && result.Project && result.Project.$ && result.Project.$.Sdk) {
            referenceType = 1 /* Attribute */;
            let splitArray = result.Project.$.Sdk.split('/');
            if (splitArray.length === 2 && splitArray[0].trim().toUpperCase() === sdkName.toUpperCase()) {
                version = splitArray[1].trim();
            }
        }
        else if (result && result.Project && result.Project.sdkName
            && result.Project.Sdk[0].$ && result.Project.Sdk[0].$.Name && result.Project.Sdk[0].$.Version) {
            referenceType = 2 /* Element */;
            if (result.Project.Sdk[0].$.Name.trim().toUpperCase() === sdkName.toUpperCase()) {
                version = result.Project.Sdk[0].$.Version.trim();
            }
        }
    });
    if (version) {
        return { path: project, sdkVersion: version, sdkReferenceType: referenceType };
    }
    return undefined;
}
function promptToUpdateVersion(unsupportedProjects, maxRequiredSDK, commandObserver) {
    let msg = localize(0, null);
    let installItem = localize(1, null);
    vscode.window.showErrorMessage(msg, installItem)
        .then((item) => {
        if (item === installItem) {
            updateProjects(unsupportedProjects, maxRequiredSDK, commandObserver);
        }
    });
}
function updateProjects(unsupportedProjects, maxRequiredSDK, commandObserver) {
    unsupportedProjects.forEach((project) => {
        let projectPath = project.path;
        let fileContent = fs.readFileSync(projectPath, 'utf8');
        commandObserver.logToOutputChannel(localize(2, null, projectPath));
        try {
            fileContent = getUpdatedXML(fileContent, project.sdkReferenceType, maxRequiredSDK);
            fs.writeFile(project.path, fileContent, (err) => {
                if (err) {
                    commandObserver.logToOutputChannel(localize(3, null, projectPath));
                }
                else {
                    commandObserver.logToOutputChannel(localize(4, null, projectPath));
                }
            });
        }
        catch (err) {
            commandObserver.logToOutputChannel(localize(5, null, projectPath));
        }
    });
}
function getUpdatedXML(fileText, sdkReferenceType, maxRequiredSDK) {
    var parser = new xml2js.Parser();
    let updatedText;
    parser.parseString(fileText, function (err, result) {
        if (sdkReferenceType === 1 /* Attribute */) {
            result.Project.$.Sdk = sdkName + '/' + maxRequiredSDK;
        }
        else {
            result.Project.Sdk[0].$.Version = maxRequiredSDK;
        }
        var builder = new xml2js.Builder({ headless: true });
        updatedText = builder.buildObject(result);
    });
    return updatedText;
}

//# sourceMappingURL=commonHelper.js.map
