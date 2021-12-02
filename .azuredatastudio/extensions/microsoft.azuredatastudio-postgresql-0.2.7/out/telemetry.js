/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const opener = require("opener");
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
const platform_1 = require("service-downloader/out/platform");
const vscode_languageclient_1 = require("vscode-languageclient");
const Utils = require("./utils");
const Constants = require("./constants");
/**
 * Filters error paths to only include source files. Exported to support testing
 */
function FilterErrorPath(line) {
    if (line) {
        let values = line.split('/out/');
        if (values.length <= 1) {
            // Didn't match expected format
            return line;
        }
        else {
            return values[1];
        }
    }
}
exports.FilterErrorPath = FilterErrorPath;
class Telemetry {
    // Get the unique ID for the current user of the extension
    static getUserId() {
        return new Promise(resolve => {
            // Generate the user id if it has not been created already
            if (typeof this.userId === 'undefined') {
                let id = Utils.generateUserId();
                id.then(newId => {
                    this.userId = newId;
                    resolve(this.userId);
                });
            }
            else {
                resolve(this.userId);
            }
        });
    }
    static getPlatformInformation() {
        if (this.platformInformation) {
            return Promise.resolve(this.platformInformation);
        }
        else {
            return new Promise(resolve => {
                platform_1.PlatformInformation.getCurrent().then(info => {
                    this.platformInformation = info;
                    resolve(this.platformInformation);
                });
            });
        }
    }
    /**
     * Disable telemetry reporting
     */
    static disable() {
        this.disabled = true;
    }
    /**
     * Initialize the telemetry reporter for use.
     */
    static initialize(context) {
        if (typeof this.reporter === 'undefined') {
            // Check if the user has opted out of telemetry
            if (!vscode.workspace.getConfiguration('telemetry').get('enableTelemetry', true)) {
                this.disable();
                return;
            }
            let packageInfo = Utils.getPackageInfo();
            this.reporter = new vscode_extension_telemetry_1.default(packageInfo.name, packageInfo.version, packageInfo.aiKey);
            // ensure it gets property disposed
            context.subscriptions.push(this.reporter);
        }
    }
    /**
     * Send a telemetry event for an exception
     */
    static sendTelemetryEventForException(err, methodName, extensionConfigName) {
        try {
            let stackArray;
            let firstLine = '';
            if (err !== undefined && err.stack !== undefined) {
                stackArray = err.stack.split('\n');
                if (stackArray !== undefined && stackArray.length >= 2) {
                    firstLine = stackArray[1]; // The fist line is the error message and we don't want to send that telemetry event
                    firstLine = FilterErrorPath(firstLine);
                }
            }
            // Only adding the method name and the fist line of the stack trace. We don't add the error message because it might have PII
            this.sendTelemetryEvent('Exception', { methodName: methodName, errorLine: firstLine });
            // Utils.logDebug('Unhandled Exception occurred. error: ' + err + ' method: ' + methodName, extensionConfigName);
        }
        catch (telemetryErr) {
            // If sending telemetry event fails ignore it so it won't break the extension
            // Utils.logDebug('Failed to send telemetry event. error: ' + telemetryErr, extensionConfigName);
        }
    }
    /**
     * Send a telemetry event using application insights
     */
    static sendTelemetryEvent(eventName, properties, measures) {
        if (typeof this.disabled === 'undefined') {
            this.disabled = false;
        }
        if (this.disabled || typeof (this.reporter) === 'undefined') {
            // Don't do anything if telemetry is disabled
            return;
        }
        if (!properties || typeof properties === 'undefined') {
            properties = {};
        }
        // Augment the properties structure with additional common properties before sending
        Promise.all([this.getUserId(), this.getPlatformInformation()]).then(() => {
            properties['userId'] = this.userId;
            properties['distribution'] = (this.platformInformation && this.platformInformation.distribution) ?
                `${this.platformInformation.distribution.name}, ${this.platformInformation.distribution.version}` : '';
            this.reporter.sendTelemetryEvent(eventName, properties, measures);
        });
    }
    /**
     * This will ensure all pending events get flushed
     */
    static dispose() { this.reporter.dispose(); }
}
Telemetry.disabled = false; // Disable the telemetry for public preview
exports.Telemetry = Telemetry;
/**
 * Handle Language Service client errors
 * @class LanguageClientErrorHandler
 */
class LanguageClientErrorHandler {
    /**
     * Show an error message prompt with a link to known issues wiki page
     * @memberOf LanguageClientErrorHandler
     */
    showOnErrorPrompt() {
        Telemetry.sendTelemetryEvent(Constants.serviceName + 'Crash');
        vscode.window.showErrorMessage(Constants.serviceCrashMessage, Constants.serviceCrashButton).then(action => {
            if (action && action === Constants.serviceCrashButton) {
                opener(Constants.serviceCrashLink);
            }
        });
    }
    /**
     * Callback for language service client error
     *
     * @param {Error} error
     * @param {Message} message
     * @param {number} count
     * @returns {ErrorAction}
     *
     * @memberOf LanguageClientErrorHandler
     */
    error(error, message, count) {
        this.showOnErrorPrompt();
        // we don't retry running the service since crashes leave the extension
        // in a bad, unrecovered state
        return vscode_languageclient_1.ErrorAction.Shutdown;
    }
    /**
     * Callback for language service client closed
     *
     * @returns {CloseAction}
     *
     * @memberOf LanguageClientErrorHandler
     */
    closed() {
        this.showOnErrorPrompt();
        // we don't retry running the service since crashes leave the extension
        // in a bad, unrecovered state
        return vscode_languageclient_1.CloseAction.DoNotRestart;
    }
}
exports.LanguageClientErrorHandler = LanguageClientErrorHandler;

//# sourceMappingURL=telemetry.js.map
