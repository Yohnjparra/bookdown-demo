/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const packageJson = require('../package.json');
let baseConfig = require('./config.json');
var packageInfo = null;
// The function is a duplicate of \src\paths.js. IT would be better to import path.js but it doesn't
// work for now because the extension is running in different process.
function getAppDataPath() {
    let platform = process.platform;
    switch (platform) {
        case 'win32': return process.env['APPDATA'] || path.join(process.env['USERPROFILE'], 'AppData', 'Roaming');
        case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support');
        case 'linux': return process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
        default: throw new Error('Platform not supported');
    }
}
exports.getAppDataPath = getAppDataPath;
function getDefaultLogLocation() {
    return path.join(getAppDataPath(), 'sqlops');
}
exports.getDefaultLogLocation = getDefaultLogLocation;
function ensure(target, key) {
    if (target[key] === void 0) {
        target[key] = {};
    }
    return target[key];
}
exports.ensure = ensure;
function getPackageInfo() {
    if (!packageInfo) {
        packageInfo = {
            name: packageJson.name,
            version: packageJson.version,
            aiKey: packageJson.aiKey,
            requiredDotNetCoreSDK: packageJson.requiredDotNetCoreSDK,
            projectTemplateNugetId: packageJson.projectTemplateNugetId,
            minSupportedPostgreSQLProjectSDK: packageJson.minSupportedPostgreSQLProjectSDK,
            maxSupportedPostgreSQLProjectSDK: packageJson.maxSupportedPostgreSQLProjectSDK
        };
    }
    return packageInfo;
}
exports.getPackageInfo = getPackageInfo;
function generateUserId() {
    return new Promise(resolve => {
        try {
            let interfaces = os.networkInterfaces();
            let mac;
            for (let key of Object.keys(interfaces)) {
                let item = interfaces[key][0];
                if (!item.internal) {
                    mac = item.mac;
                    break;
                }
            }
            if (mac) {
                resolve(crypto.createHash('sha256').update(mac + os.homedir(), 'utf8').digest('hex'));
            }
            else {
                resolve(generateGuid());
            }
        }
        catch (err) {
            resolve(generateGuid()); // fallback
        }
    });
}
exports.generateUserId = generateUserId;
function generateGuid() {
    let hexValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
    // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
    let oct = '';
    let tmp;
    /* tslint:disable:no-bitwise */
    for (let a = 0; a < 4; a++) {
        tmp = (4294967296 * Math.random()) | 0;
        oct += hexValues[tmp & 0xF] +
            hexValues[tmp >> 4 & 0xF] +
            hexValues[tmp >> 8 & 0xF] +
            hexValues[tmp >> 12 & 0xF] +
            hexValues[tmp >> 16 & 0xF] +
            hexValues[tmp >> 20 & 0xF] +
            hexValues[tmp >> 24 & 0xF] +
            hexValues[tmp >> 28 & 0xF];
    }
    // 'Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively'
    let clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
    return oct.substr(0, 8) + '-' + oct.substr(9, 4) + '-4' + oct.substr(13, 3) + '-' + clockSequenceHi + oct.substr(16, 3) + '-' + oct.substr(19, 12);
    /* tslint:enable:no-bitwise */
}
exports.generateGuid = generateGuid;
function verifyPlatform() {
    if (os.platform() === 'darwin' && parseFloat(os.release()) < 16.0) {
        return Promise.resolve(false);
    }
    else {
        return Promise.resolve(true);
    }
}
exports.verifyPlatform = verifyPlatform;
function getServiceInstallConfig() {
    let config = JSON.parse(JSON.stringify(baseConfig));
    config.installDirectory = path.join(__dirname, config.installDirectory);
    return config;
}
exports.getServiceInstallConfig = getServiceInstallConfig;
function getResolvedServiceInstallationPath(runtime) {
    let config = getServiceInstallConfig();
    let dir = config.installDirectory;
    dir = dir.replace('{#version#}', config.version);
    dir = dir.replace('{#platform#}', getRuntimeDisplayName(runtime));
    return dir;
}
exports.getResolvedServiceInstallationPath = getResolvedServiceInstallationPath;
function getRuntimeDisplayName(runtime) {
    switch (runtime) {
        case Runtime.Windows_64:
            return 'Windows';
        case Runtime.Windows_86:
            return 'Windows';
        case Runtime.OSX:
            return 'OSX';
        case Runtime.Linux_64:
            return 'Linux';
        default:
            return 'Unknown';
    }
}
exports.getRuntimeDisplayName = getRuntimeDisplayName;
var Runtime;
(function (Runtime) {
    Runtime[Runtime["Unknown"] = 'Unknown'] = "Unknown";
    Runtime[Runtime["Windows_86"] = 'Windows_86'] = "Windows_86";
    Runtime[Runtime["Windows_64"] = 'Windows_64'] = "Windows_64";
    Runtime[Runtime["OSX"] = 'OSX'] = "OSX";
    Runtime[Runtime["CentOS_7"] = 'CentOS_7'] = "CentOS_7";
    Runtime[Runtime["Debian_8"] = 'Debian_8'] = "Debian_8";
    Runtime[Runtime["Fedora_23"] = 'Fedora_23'] = "Fedora_23";
    Runtime[Runtime["OpenSUSE_13_2"] = 'OpenSUSE_13_2'] = "OpenSUSE_13_2";
    Runtime[Runtime["SLES_12_2"] = 'SLES_12_2'] = "SLES_12_2";
    Runtime[Runtime["RHEL_7"] = 'RHEL_7'] = "RHEL_7";
    Runtime[Runtime["Ubuntu_14"] = 'Ubuntu_14'] = "Ubuntu_14";
    Runtime[Runtime["Ubuntu_16"] = 'Ubuntu_16'] = "Ubuntu_16";
    Runtime[Runtime["Linux_64"] = 'Linux_64'] = "Linux_64";
    Runtime[Runtime["Linux_86"] = 'Linux-86'] = "Linux_86";
})(Runtime = exports.Runtime || (exports.Runtime = {}));

//# sourceMappingURL=utils.js.map
