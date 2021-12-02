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
const path = require("path");
const Utils = require("./utils");
const commonHelper_1 = require("./commonHelper");
const dotnet_1 = require("./dotnet");
const nls = require("vscode-nls");
const localize = nls.loadMessageBundle(__filename);
function buildProjects(projects, commandObserver, cancelToken) {
    return __awaiter(this, void 0, void 0, function* () {
        var buildResult = new Array();
        if (commandObserver.buildInProgress) {
            vscode.window.showErrorMessage(localize(0, null));
            return Promise.resolve(buildResult);
        }
        try {
            var successProjectCount = 0;
            var failedProjectCount = 0;
            commandObserver.buildInProgress = true;
            commandObserver.resetOutputChannel();
            vscode.workspace.saveAll();
            let unsupportedProjects = yield validateProjectSDK(projects, commandObserver);
            if (unsupportedProjects.length > 0) {
                projects = projects.filter(p => unsupportedProjects.indexOf(p) < 0);
                unsupportedProjects.map(p => buildResult.push({ project: p, status: 3 /* Skipped */ }));
            }
            for (let project of projects) {
                if (cancelToken && cancelToken.isCancellationRequested) {
                    return;
                }
                yield dotnetBuild(project, commandObserver, cancelToken).then(() => {
                    successProjectCount++;
                    buildResult.push({ project: project, status: 1 /* Success */ });
                }, () => {
                    failedProjectCount++;
                    buildResult.push({ project: project, status: 2 /* Failure */ });
                });
            }
            commandObserver.logToOutputChannel(localize(1, null, successProjectCount, failedProjectCount, unsupportedProjects.length));
        }
        catch (err) {
            vscode.window.showErrorMessage(err);
        }
        finally {
            commandObserver.buildInProgress = false;
        }
        return Promise.resolve(buildResult);
    });
}
exports.buildProjects = buildProjects;
function validateProjectSDK(projects, commandObserver) {
    return __awaiter(this, void 0, void 0, function* () {
        var packageInfo = Utils.getPackageInfo();
        let unsupportedProjects = yield commonHelper_1.checkProjectVersion(packageInfo.minSupportedPostgreSQLProjectSDK, packageInfo.maxSupportedPostgreSQLProjectSDK, projects, commandObserver);
        if (unsupportedProjects && unsupportedProjects.length > 0) {
            unsupportedProjects.map(p => commandObserver.logToOutputChannel(localize(2, null, p.path, p.sdkVersion, packageInfo.minSupportedPostgreSQLProjectSDK, packageInfo.maxSupportedPostgreSQLProjectSDK)));
        }
        return Promise.resolve(unsupportedProjects.map(p => p.path));
    });
}
function dotnetBuild(project, commandObserver, cancelToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let args = ['build', project, '-v', 'n'];
        yield dotnet_1.runDotNetCommand(args, commandObserver, handleBuildCommandData, cancelToken, handleBuildCommandCancel);
    });
}
function getProjectPath(projectName, folder) {
    return folder + path.sep + projectName + '.pgproj';
}
exports.getProjectPath = getProjectPath;
function createProjectFile(projectPath, projectSDK) {
    let templatefileName = 'project.tmpl';
    vscode.workspace.openTextDocument(vscode.extensions.getExtension('Microsoft.azuredatastudio-postgresql').extensionPath + '/templates/' + templatefileName)
        .then((doc) => {
        let text = doc.getText();
        text = text.replace('${projectSDK}', projectSDK);
        fs.writeFileSync(projectPath, text);
        vscode.workspace.openTextDocument(projectPath).then((doc) => {
            vscode.window.showTextDocument(doc);
        });
    });
}
exports.createProjectFile = createProjectFile;
function setOutputFilePath(project, commandObserver) {
    return __awaiter(this, void 0, void 0, function* () {
        let args = ['build', project, '-t:GetOutputFilePath'];
        yield dotnet_1.runDotNetCommand(args, commandObserver, handleGetOutputFileCommandData);
    });
}
exports.setOutputFilePath = setOutputFilePath;
const outputFilePathRegex = /###(?<path>(.*))###/;
function handleGetOutputFileCommandData(stream, commandObserver) {
    stream.on('data', function (chunk) {
        const match = outputFilePathRegex.exec(chunk.toString());
        if (match) {
            commandObserver.outputFilePath = match['groups'].path;
        }
    });
}
function handleBuildCommandData(stream, commandObserver) {
    stream.on('data', function (chunk) {
        commandObserver.next(chunk.toString());
    });
}
function handleBuildCommandCancel(buildProcess, commandObserver, cancelToken) {
    if (cancelToken) {
        cancelToken.onCancellationRequested(() => {
            buildProcess.kill();
            commandObserver.logToOutputChannel(localize(3, null));
        });
    }
}

//# sourceMappingURL=projectHelper.js.map
