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
const azdata = require("azdata");
const fs = require("fs");
const path = require("path");
const Constants = require("./constants");
const projectHelper = require("./projectHelper");
const dotnet_1 = require("./dotnet");
const nls = require("vscode-nls");
const localize = nls.loadMessageBundle(__filename);
function registerCommands(commandObserver, packageInfo, client) {
    let dotNetSdkVersion = packageInfo.requiredDotNetCoreSDK;
    return [
        vscode.commands.registerCommand('pgproj.build.all', () => __awaiter(this, void 0, void 0, function* () {
            dotnet_1.requireDotNetSdk(dotNetSdkVersion).then(() => __awaiter(this, void 0, void 0, function* () {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: localize(0, null),
                    cancellable: true
                }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
                    yield buildAllProjects(commandObserver, token);
                }));
            }));
        })),
        vscode.commands.registerCommand('pgproj.build.current', (args) => __awaiter(this, void 0, void 0, function* () {
            dotnet_1.requireDotNetSdk(dotNetSdkVersion).then(() => __awaiter(this, void 0, void 0, function* () {
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: localize(1, null),
                    cancellable: true
                }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
                    yield buildCurrentProject(args, commandObserver, token);
                }));
            }));
        })),
        vscode.commands.registerCommand('pgproj.deploy.current', (args) => __awaiter(this, void 0, void 0, function* () {
            dotnet_1.requireDotNetSdk(dotNetSdkVersion).then(() => __awaiter(this, void 0, void 0, function* () {
                yield deployCurrentProject(args, commandObserver, client);
            }));
        })),
        vscode.commands.registerCommand('pgproj.add.new', (args) => __awaiter(this, void 0, void 0, function* () {
            yield addNewPostgreSQLProject(args, packageInfo.maxSupportedPostgreSQLProjectSDK);
        }))
    ];
}
exports.default = registerCommands;
function buildAllProjects(commandObserver, cancelToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let projects = yield vscode.workspace.findFiles('{**/*.pgproj}');
        yield projectHelper.buildProjects(projects.map(p => p.fsPath), commandObserver, cancelToken);
    });
}
function buildCurrentProject(args, commandObserver, cancelToken) {
    return __awaiter(this, void 0, void 0, function* () {
        let project = '';
        if (!args) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor !== undefined) {
                project = activeEditor.document.uri.fsPath;
            }
        }
        else {
            project = args.fsPath;
        }
        yield projectHelper.buildProjects([project], commandObserver, cancelToken);
    });
}
function deployCurrentProject(args, commandObserver, client) {
    return __awaiter(this, void 0, void 0, function* () {
        let project = '';
        if (!args) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor !== undefined) {
                project = activeEditor.document.uri.fsPath;
            }
        }
        else {
            project = args.fsPath;
        }
        try {
            yield projectHelper.buildProjects([project], commandObserver).then((result) => __awaiter(this, void 0, void 0, function* () {
                if (result && !result.some(b => b.status === 2 /* Failure */ || b.status === 3 /* Skipped */)) {
                    yield projectHelper.setOutputFilePath(project, commandObserver);
                    var fileUri = vscode.Uri.file(commandObserver.outputFilePath);
                    if (fileUri.fsPath && fs.existsSync(fileUri.fsPath)) {
                        var connection = yield azdata.connection.openConnectionDialog([Constants.providerId]);
                        if (connection) {
                            var filePath = fileUri.toString(true);
                            let projectFileText = fs.readFileSync(fileUri.fsPath, 'utf8');
                            azdata.queryeditor.connect(filePath, connection.connectionId).then(() => {
                                commandObserver.logToOutputChannel(localize(2, null, new Date().toLocaleString()));
                                client.sendRequest("query/executeDeploy", { owner_uri: filePath, query: projectFileText })
                                    .then(() => { }, err => {
                                    commandObserver.logToOutputChannel(localize(3, null, err.message));
                                });
                            });
                        }
                    }
                    else {
                        vscode.window.showErrorMessage(localize(4, null));
                    }
                }
                else {
                    vscode.window.showErrorMessage(localize(5, null));
                }
            }));
        }
        finally {
            commandObserver.outputFilePath = "";
        }
    });
}
function addNewPostgreSQLProject(args, projectSDK) {
    return __awaiter(this, void 0, void 0, function* () {
        let folder = args.fsPath;
        var defaultProjectName = path.basename(folder);
        var projectName = yield vscode.window.showInputBox({
            prompt: localize(6, null),
            value: defaultProjectName,
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return localize(7, null);
                }
                if (/[\/?:&*"<>|#%;\\]/g.test(value)) {
                    return localize(8, null);
                }
                if (value === '.' || value === '..') {
                    return localize(9, null);
                }
                if (value.includes('..')) {
                    return localize(10, null);
                }
                if (fs.existsSync(projectHelper.getProjectPath(value, folder))) {
                    return localize(11, null);
                }
                return null;
            }
        });
        if (!projectName) {
            return;
        }
        try {
            projectHelper.createProjectFile(projectHelper.getProjectPath(projectName, folder), projectSDK);
        }
        catch (err) {
            vscode.window.showErrorMessage(err);
        }
    });
}

//# sourceMappingURL=commands.js.map
