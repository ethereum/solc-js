const fs = require("fs");
const { execSync } = require("child_process");
const keccak256 = require('js-sha3').keccak256;
import https = require('https');
import { IncomingMessage } from 'http';
import MemoryStream = require('memorystream');
const solc = require('../index.js');


//------------------------smtcallback-----------------------------------------

export function collectErrors (solOutput: any) {
  if (solOutput === undefined) {
    return [];
  }

  let errors = [];
  for (let i in solOutput.errors) {
    let error = solOutput.errors[i];
    if (error.message.includes('This is a pre-release compiler version')) {
      continue;
    }
    errors.push(error.message);
  }
  return errors;
}

export function expectErrors (errors: any, expectations: any) : boolean{
  if (errors.length !== expectations.length) {
    return false;
  }

  for (let i in errors) {
    if (!errors[i].includes(expectations[i])) {
      return false;
    }
  }

  return true;
}

//------------------------Compilation-----------------------------------------

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



//-----------------------downloadCurrentVersion-----------------------------------

export function downloadBinary(outputName: string, version: string, expectedHash: string): void {
    console.log('Downloading version', version);

    // Remove if existing
    if (fs.existsSync(outputName)) {
        fs.unlinkSync(outputName);
    }

    process.on('SIGINT', () => {
        console.log('Interrupted, removing file.');
        fs.unlinkSync(outputName);
        process.exit(1);
    });

    const file: any = fs.createWriteStream(outputName, { encoding: 'binary' });
    https.get('https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/' + version, (response: IncomingMessage) => {
        if (response.statusCode !== 200) {
            console.log('Error downloading file: ' + response.statusCode);
            process.exit(1);
        }
        response.pipe(file);
        file.on('finish', () => {
            file.close().then(() => {
                const hash: string = '0x' + keccak256(fs.readFileSync(outputName, { encoding: 'binary' }));
                if (expectedHash !== hash) {
                    console.log('Hash mismatch: ' + expectedHash + ' vs ' + hash);
                    process.exit(1);
                }
                console.log('Done.');
            });
        });
    });
}

export function getVersionList(callback: any): void {
    console.log('Retrieving available version list...');

    const mem: MemoryStream = new MemoryStream(null, { readable: false });
    https.get('https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json', (response: IncomingMessage) => {
        if (response.statusCode !== 200) {
            console.log('Error downloading file: ' + response.statusCode);
            process.exit(1);
        }
        response.pipe(mem);
        response.on('end', () => {
            callback(mem.toString());
        });
    });
}

//-----------------------linker-----------------------------------

export function libraryHashPlaceholder(input: string): string {
    return '$' + keccak256(input).slice(0, 34) + '$';
}

//-----------------------translate-----------------------------------

export function escapeString(text: string): string {
    return text
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

// 'asm' can be an object or a string
export function formatAssemblyText(asm: any, prefix: string, source: string): string {
    if (typeof asm === 'string' || asm === null || asm === undefined) {
        return prefix + (asm || '') + '\n';
    }
    let text: string = prefix + '.code\n';
    asm['.code'].forEach(function (item) {
        const v: string = item.value === undefined ? '' : item.value;
        let src: string = '';
        if (source !== undefined && item.begin !== undefined && item.end !== undefined) {
            src = escapeString(source.slice(item.begin, item.end));
        }
        if (src.length > 30) {
            src = src.slice(0, 30) + '...';
        }
        if (item.name !== 'tag') {
            text += '  ';
        }
        text += prefix + item.name + ' ' + v + '\t\t\t' + src + '\n';
    });
    text += prefix + '.data\n';
    const asmData: any = asm['.data'] || [];
    for (const i in asmData) {
        const item: string = asmData[i];
        text += '  ' + prefix + '' + i + ':\n';
        text += formatAssemblyText(item, prefix + '    ', source);
    }
    return text;
}
