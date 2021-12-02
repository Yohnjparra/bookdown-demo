/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const Constants = require("./constants");
const telemetry_1 = require("./telemetry");
const msbuildOutputRegex = /^\s*([\d]>)?(((?<origin>([^\s].*))):|())\s*(?<subcategory>(()|([^:]*? )))(?<category>(error|warning))(\s*(?<code>[^: ]*))?\s*:\s*(?<text>.*)$/gm;
const lineRegex = /^(?<origin>([^\s].*))(\((?<linedetails>(\d+|\d+-\d+|\d+,\d+((-\d+)?)|\d+,\d+,\d+,\d+))\))$/;
class CommandObserver {
    constructor() {
        this._outputChannel = null;
        this._diagnosticCollection = null;
        this._diagnosticMap = new Map();
        this._buildInProgress = false;
    }
    get outputFilePath() {
        return this._outputFilePath;
    }
    set outputFilePath(filePath) {
        this._outputFilePath = filePath;
    }
    get buildInProgress() {
        return this._buildInProgress;
    }
    set buildInProgress(inProg) {
        this._buildInProgress = inProg;
    }
    resetOutputChannel() {
        this.setOutputChannel();
        this.clear();
        this._outputChannel.show(true);
    }
    next(message) {
        this.setOutputChannel();
        this._outputChannel.appendLine(message);
        this.setDiagnosticCollection();
        try {
            this.parseDiagnostics(message);
            this._diagnosticMap.forEach((value, key) => {
                var uri = vscode.Uri.file(key);
                this._diagnosticCollection.set(uri, value);
            });
        }
        catch (_a) {
            telemetry_1.Telemetry.sendTelemetryEvent('FailedToParseBuildMessage');
        }
    }
    logToOutputChannel(message) {
        this.setOutputChannel();
        this._outputChannel.appendLine(message);
    }
    setOutputChannel() {
        if (!this._outputChannel) {
            this._outputChannel = vscode.window.createOutputChannel(Constants.projectOutputChannel);
        }
    }
    setDiagnosticCollection() {
        if (!this._diagnosticCollection) {
            this._diagnosticCollection = vscode.languages.createDiagnosticCollection('build');
        }
    }
    parseDiagnostics(output) {
        let match;
        while ((match = msbuildOutputRegex.exec(output)) !== null) {
            var file = match.groups.origin.trim();
            const lineMatch = lineRegex.exec(file);
            let lineDetails;
            if (lineMatch) {
                file = lineMatch['groups'].origin;
                lineDetails = lineMatch['groups'].linedetails;
            }
            let diag = {
                code: match.groups.code,
                message: match.groups.text,
                range: this.getRange(lineDetails),
                severity: match.groups.category && match.groups.category === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
            };
            if (this._diagnosticMap.has(file)) {
                let diagArray = this._diagnosticMap.get(file);
                var index = diagArray.findIndex(d => d.message === match.groups.text);
                if (index < 0) {
                    diagArray.push(diag);
                }
            }
            else {
                this._diagnosticMap.set(file, [diag]);
            }
        }
        msbuildOutputRegex.lastIndex = 0;
    }
    getRange(lineDetails) {
        let lineNumber = 0;
        let column = 0;
        let endLineNumber = 0;
        let endColumn = 0;
        if (lineDetails) {
            let array = lineDetails.split(/[,-]/).map(p => Number(p));
            lineNumber = array[0] - 1 || 0;
            column = array[1] - 1 || 0;
            endLineNumber = array[2] - 1 || 0;
            endColumn = array[3] - 1 || 0;
        }
        return new vscode.Range(new vscode.Position(lineNumber, column), new vscode.Position(endLineNumber, endColumn));
    }
    clear() {
        if (this._outputChannel) {
            this._outputChannel.clear();
        }
        if (this._diagnosticCollection) {
            this._diagnosticCollection.clear();
        }
        if (this._diagnosticMap) {
            this._diagnosticMap.clear();
        }
    }
}
exports.CommandObserver = CommandObserver;

//# sourceMappingURL=commandObserver.js.map
