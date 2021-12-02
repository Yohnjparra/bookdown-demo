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
const path = require("path");
const dataprotocol_client_1 = require("dataprotocol-client");
const service_downloader_1 = require("service-downloader");
const vscode_languageclient_1 = require("vscode-languageclient");
const nls = require("vscode-nls");
// this should precede local imports because they can trigger localization calls
const localize = nls.config({ messageFormat: nls.MessageFormat.file })(__filename);
const commands_1 = require("./commands");
const Constants = require("./constants");
const contextProvider_1 = require("./contextProvider");
const Utils = require("./utils");
const Helper = require("./commonHelper");
const telemetry_1 = require("./telemetry");
const commandObserver_1 = require("./commandObserver");
const vscode_languageclient_2 = require("vscode-languageclient");
const baseConfig = require('./config.json');
const outputChannel = vscode.window.createOutputChannel(Constants.serviceName);
const statusView = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        // lets make sure we support this platform first
        let supported = yield Utils.verifyPlatform();
        if (!supported) {
            vscode.window.showErrorMessage('Unsupported platform');
            return;
        }
        telemetry_1.Telemetry.initialize(context);
        let config = JSON.parse(JSON.stringify(baseConfig));
        config.installDirectory = path.join(__dirname, config.installDirectory);
        config.proxy = vscode.workspace.getConfiguration('http').get('proxy');
        config.strictSSL = vscode.workspace.getConfiguration('http').get('proxyStrictSSL') || true;
        let languageClient;
        const serverdownloader = new service_downloader_1.ServerProvider(config);
        serverdownloader.eventEmitter.onAny(generateHandleServerProviderEvent());
        let clientOptions = {
            providerId: Constants.providerId,
            errorHandler: new telemetry_1.LanguageClientErrorHandler(),
            documentSelector: ['sql'],
            synchronize: {
                configurationSection: 'pgsql'
            },
        };
        let packageInfo = Utils.getPackageInfo();
        let commandObserver = new commandObserver_1.CommandObserver();
        const installationStart = Date.now();
        serverdownloader.getOrDownloadServer().then(e => {
            const installationComplete = Date.now();
            let serverOptions = generateServerOptions(e);
            languageClient = new dataprotocol_client_1.SqlOpsDataClient(Constants.serviceName, serverOptions, clientOptions);
            for (let command of commands_1.default(commandObserver, packageInfo, languageClient)) {
                context.subscriptions.push(command);
            }
            const processStart = Date.now();
            languageClient.onReady().then(() => {
                const processEnd = Date.now();
                statusView.text = 'Pgsql service started';
                setTimeout(() => {
                    statusView.hide();
                }, 1500);
                telemetry_1.Telemetry.sendTelemetryEvent('startup/LanguageClientStarted', {
                    installationTime: String(installationComplete - installationStart),
                    processStartupTime: String(processEnd - processStart),
                    totalTime: String(processEnd - installationStart),
                    beginningTimestamp: String(installationStart)
                });
                addDeployNotificationsHandler(languageClient, commandObserver);
            });
            statusView.show();
            statusView.text = 'Starting pgsql service';
            languageClient.start();
        }, _e => {
            telemetry_1.Telemetry.sendTelemetryEvent('ServiceInitializingFailed');
            vscode.window.showErrorMessage('Failed to start Pgsql tools service');
        });
        let contextProvider = new contextProvider_1.default();
        context.subscriptions.push(contextProvider);
        try {
            var pgProjects = yield vscode.workspace.findFiles('{**/*.pgproj}');
            if (pgProjects.length > 0) {
                yield Helper.checkProjectVersion(packageInfo.minSupportedPostgreSQLProjectSDK, packageInfo.maxSupportedPostgreSQLProjectSDK, pgProjects.map(p => p.fsPath), commandObserver);
            }
        }
        catch (err) {
            outputChannel.appendLine(`Failed to verify project SDK, error: ${err}`);
        }
        context.subscriptions.push({ dispose: () => languageClient.stop() });
    });
}
exports.activate = activate;
function addDeployNotificationsHandler(client, commandObserver) {
    const queryCompleteType = new vscode_languageclient_2.NotificationType('query/deployComplete');
    client.onNotification(queryCompleteType, (data) => {
        if (!data.batchSummaries.some(s => s.hasError)) {
            commandObserver.logToOutputChannel(localize(0, null));
        }
    });
    const queryMessageType = new vscode_languageclient_2.NotificationType('query/deployMessage');
    client.onNotification(queryMessageType, (data) => {
        var messageText = data.message.isError ? localize(1, null, data.message.message) : localize(2, null, data.message.message);
        commandObserver.logToOutputChannel(messageText);
    });
    const queryBatchStartType = new vscode_languageclient_2.NotificationType('query/deployBatchStart');
    client.onNotification(queryBatchStartType, (data) => {
        if (data.batchSummary.selection) {
            commandObserver.logToOutputChannel(localize(3, null, data.batchSummary.selection.startLine + 1));
        }
    });
}
function generateServerOptions(executablePath) {
    let serverArgs = [];
    let serverCommand = executablePath;
    let config = vscode.workspace.getConfiguration("pgsql");
    if (config) {
        // Override the server path with the local debug path if enabled
        let useLocalSource = config["useDebugSource"];
        if (useLocalSource) {
            let localSourcePath = config["debugSourcePath"];
            let filePath = path.join(localSourcePath, "ossdbtoolsservice/ossdbtoolsservice_main.py");
            process.env.PYTHONPATH = localSourcePath;
            serverCommand = process.platform === 'win32' ? 'python' : 'python3';
            let enableStartupDebugging = config["enableStartupDebugging"];
            let debuggingArg = enableStartupDebugging ? '--enable-remote-debugging-wait' : '--enable-remote-debugging';
            let debugPort = config["debugServerPort"];
            debuggingArg += '=' + debugPort;
            serverArgs = [filePath, debuggingArg];
        }
        let logFileLocation = path.join(Utils.getDefaultLogLocation(), "pgsql");
        serverArgs.push('--log-dir=' + logFileLocation);
        serverArgs.push(logFileLocation);
        // Enable diagnostic logging in the service if it is configured
        let logDebugInfo = config["logDebugInfo"];
        if (logDebugInfo) {
            serverArgs.push('--enable-logging');
        }
    }
    // run the service host
    return { command: serverCommand, args: serverArgs, transport: vscode_languageclient_1.TransportKind.stdio };
}
function generateHandleServerProviderEvent() {
    let dots = 0;
    return (e, ...args) => {
        switch (e) {
            case "install_start" /* INSTALL_START */:
                outputChannel.show(true);
                statusView.show();
                outputChannel.appendLine(`Installing ${Constants.serviceName} service to ${args[0]}`);
                statusView.text = 'Installing Service';
                break;
            case "install_end" /* INSTALL_END */:
                outputChannel.appendLine('Installed');
                break;
            case "download_start" /* DOWNLOAD_START */:
                outputChannel.appendLine(`Downloading ${args[0]}`);
                outputChannel.append(`(${Math.ceil(args[1] / 1024)} KB)`);
                statusView.text = 'Downloading Service';
                break;
            case "download_progress" /* DOWNLOAD_PROGRESS */:
                let newDots = Math.ceil(args[0] / 5);
                if (newDots > dots) {
                    outputChannel.append('.'.repeat(newDots - dots));
                    dots = newDots;
                }
                break;
            case "download_end" /* DOWNLOAD_END */:
                outputChannel.appendLine('Done!');
                break;
            default:
                console.error(`Unknown event from Server Provider ${e}`);
                break;
        }
    };
}
// this method is called when your extension is deactivated
function deactivate() {
    telemetry_1.Telemetry.dispose();
}
exports.deactivate = deactivate;

//# sourceMappingURL=main.js.map
