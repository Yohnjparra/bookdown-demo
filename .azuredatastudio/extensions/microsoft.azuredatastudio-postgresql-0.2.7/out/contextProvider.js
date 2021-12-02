/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const azdata = require("azdata");
var BuiltInCommands;
(function (BuiltInCommands) {
    BuiltInCommands["SetContext"] = "setContext";
})(BuiltInCommands = exports.BuiltInCommands || (exports.BuiltInCommands = {}));
var ContextKeys;
(function (ContextKeys) {
    ContextKeys["ISCLOUD"] = "pgsql:iscloud";
})(ContextKeys = exports.ContextKeys || (exports.ContextKeys = {}));
const isCloudEditions = [
    5,
    6
];
function setCommandContext(key, value) {
    return vscode.commands.executeCommand(BuiltInCommands.SetContext, key, value);
}
exports.setCommandContext = setCommandContext;
class ContextProvider {
    constructor() {
        this._disposables = new Array();
        this._disposables.push(azdata.workspace.onDidOpenDashboard(this.onDashboardOpen, this));
        this._disposables.push(azdata.workspace.onDidChangeToDashboard(this.onDashboardOpen, this));
    }
    onDashboardOpen(e) {
        let iscloud;
        if (e.profile.providerName.toLowerCase() === 'pgsql' && e.serverInfo.engineEditionId) {
            if (isCloudEditions.some(i => i === e.serverInfo.engineEditionId)) {
                iscloud = true;
            }
            else {
                iscloud = false;
            }
        }
        if (iscloud === true || iscloud === false) {
            setCommandContext(ContextKeys.ISCLOUD, iscloud);
        }
    }
    dispose() {
        this._disposables = this._disposables.map(i => i.dispose());
    }
}
exports.default = ContextProvider;

//# sourceMappingURL=contextProvider.js.map
