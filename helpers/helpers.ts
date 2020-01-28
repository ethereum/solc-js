const fs = require("fs");
const axios = require("axios");
const { execSync } = require("child_process");
const solc = require('../index.js');

// New compiler interface features 0.1.6, 0.2.1, 0.4.11, 0.5.0, etc.
// 0.4.0 added pragmas (used in tests above)
export const versions: Array<string> = [
  "v0.1.1+commit.6ff4cd6",
  "v0.1.6+commit.d41f8b7",
  "v0.2.0+commit.4dc2445",
  "v0.2.1+commit.91a6b35",
  "v0.3.6+commit.3fc68da",
  "v0.4.0+commit.acd334c9",
  "v0.4.11+commit.68ef5810",
  "v0.4.12+commit.194ff033",
  "v0.4.26+commit.4563c3fc",
];

export let solcs: Array<string> = [];
export let solcVersions: Array<Array<any>> = [];

export function initialize() {
  versions.forEach(version => {
    execSync(
      `curl -o /tmp/${version}.js https://ethereum.github.io/solc-bin/bin/soljson-${version}.js`
    );
    const newSolc = require("../wrapper.js")(require(`/tmp/${version}.js`));
    solcs.push(newSolc);
    solcVersions.push([newSolc, version]);
  });

  solcVersions.push([solc, "latest"])

  return solcVersions;
}

export function getBytecode(
  output: any,
  fileName: string,
  contractName: string,
  solc: any,
  semver: any
) {
  try {
    let outputContract;
    if (semver.lt(solc.semver(), "0.4.9")) {
      outputContract = output.contracts[contractName];
    } else {
      outputContract = output.contracts[fileName + ":" + contractName];
    }
    return outputContract.bytecode;
  } catch (e) {
    return "";
  }
}

export function getBytecodeStandard(
  output: any,
  fileName: string,
  contractName: string,
  solc: any,
  semver: any
) {
  try {
    let outputFile;
    if (semver.lt(solc.semver(), "0.4.9")) {
      outputFile = output.contracts[""];
    } else {
      outputFile = output.contracts[fileName];
    }
    return outputFile[contractName].evm.bytecode.object;
  } catch (e) {
    return "";
  }
}

export function getGasEstimate(
  output: any,
  fileName: string,
  contractName: string,
  solc: any,
  semver: any
) {
  try {
    var outputFile;
    if (semver.lt(solc.semver(), "0.4.9")) {
      outputFile = output.contracts[""];
    } else {
      outputFile = output.contracts[fileName];
    }
    return outputFile[contractName].evm.gasEstimates;
  } catch (e) {
    return "";
  }
}

export function expectError(output: any, errorType: any, message: string) {
  if (output.errors) {
    for (let error in output.errors) {
      error = output.errors[error];
      if (error["type"] === errorType) {
        if (message) {
          if (error["message"].match(message) !== null) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
  }
  return false;
}

export function expectNoError(output: any) {
  if (output["errors"]) {
    for (let error in output.errors) {
      error = output.errors[error];
      if (error["severity"] === "error") {
        return false;
      }
    }
  }
  return true;
}
