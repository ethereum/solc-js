// import * as semver from 'semver';
// import solc = require('../index');

// export function getBytecode(output: any, fileName: string, contractName: string) {
//     try {
//         let outputContract;
//         if (semver.lt(solc.semver(), '0.4.9')) {
//             outputContract = output['contracts'][contractName];
//         } else {
//             outputContract = output['contracts'][fileName + ':' + contractName];
//         }
//         return outputContract['bytecode'];
//     } catch (e) {
//         return '';
//     }
// }

// export function getBytecodeStandard(output: any, fileName, contractName) {
//     try {
//         let outputFile;
//         if (semver.lt(solc.semver(), '0.4.9')) {
//             outputFile = output.contracts[''];
//         } else {
//             outputFile = output.contracts[fileName];
//         }
//         return outputFile[contractName]['evm']['bytecode']['object'];
//     } catch (e) {
//         return '';
//     }
// }

// export function getGasEstimate(output: any, fileName, contractName) {
//     try {
//         var outputFile;
//         if (semver.lt(solc.semver(), '0.4.9')) {
//             outputFile = output.contracts[''];
//         } else {
//             outputFile = output.contracts[fileName];
//         }
//         return outputFile[contractName]['evm']['gasEstimates'];
//     } catch (e) {
//         return '';
//     }
// }

// export function expectError(output: any, errorType: any, message: any) {
//     if (output.errors) {
//         for (let error in output.errors) {
//             error = output.errors[error];
//             if (error['type'] === errorType) {
//                 if (message) {
//                     if (error['message'].match(message) !== null) {
//                         return true;
//                     }
//                 } else {
//                     return true;
//                 }
//             }
//         }
//     }
//     return false;
// }

// export function expectNoError(output: any) {
//     if (output['errors']) {
//         for (let error in output['errors']) {
//             error = output['errors'][error];
//             if (error['severity'] === 'error') {
//                 return false;
//             }
//         }
//     }
//     return true;
// }
