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
const which = require("which");
const cp = require("child_process");
const semver = require("semver");
const nls = require("vscode-nls");
const outputFilePathRegex = /###(?<path>(.*))###/;
const localize = nls.loadMessageBundle(__filename);
let dotnetInfo = undefined;
function promptToInstallDotNetCoreSDK(msg) {
    let installItem = localize(0, null);
    vscode.window.showErrorMessage(msg, installItem)
        .then((item) => {
        if (item === installItem) {
            vscode.env.openExternal(vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=2112623'));
        }
    });
}
/**
 * Returns the path to the .NET Core SDK, or prompts the user to install
 * if the SDK is not found.
 */
function findDotNetSdk() {
    return new Promise((resolve, reject) => {
        if (dotnetInfo === undefined) {
            try {
                let dotnetPath = which.sync('dotnet');
                cp.exec('dotnet --version', (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else if (stderr && stderr.length > 0) {
                        reject(new Error(stderr));
                    }
                    else {
                        dotnetInfo = { path: dotnetPath, version: stdout.trim() };
                        resolve(dotnetInfo);
                    }
                });
            }
            catch (ex) {
                promptToInstallDotNetCoreSDK(localize(1, null));
                reject(ex);
            }
        }
        else {
            resolve(dotnetInfo);
        }
    });
}
exports.findDotNetSdk = findDotNetSdk;
function requireDotNetSdk(version) {
    return new Promise((resolve, reject) => {
        findDotNetSdk()
            .then(dotnet => {
            if (version !== undefined && semver.lt(dotnet.version, version)) {
                let msg = localize(2, null, version, dotnet.version);
                promptToInstallDotNetCoreSDK(msg);
                reject(msg);
            }
            resolve(dotnet);
        });
    });
}
exports.requireDotNetSdk = requireDotNetSdk;
function runDotNetCommand(args, commandObserver, handleData, cancelToken, handleCancel) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield new Promise((resolve, reject) => {
            let cmd = 'dotnet';
            let dotnet = cp.spawn(cmd, args, { env: process.env });
            if (cancelToken && handleCancel) {
                handleCancel(dotnet, commandObserver, cancelToken);
            }
            handleData(dotnet.stdout, commandObserver);
            handleData(dotnet.stderr, commandObserver);
            dotnet.on('close', (code) => {
                if (code === 1) {
                    reject();
                }
                resolve();
            });
            dotnet.on('error', err => {
                reject(err);
            });
        });
    });
}
exports.runDotNetCommand = runDotNetCommand;

//# sourceMappingURL=dotnet.js.map
