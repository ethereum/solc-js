import linker = require('./linker');
import { escapeString, formatAssemblyText } from './helpers'
/// Translate old style version numbers to semver.
/// Old style: 0.3.6-3fc68da5/Release-Emscripten/clang
///            0.3.5-371690f0/Release-Emscripten/clang/Interpreter
///            0.3.5-0/Release-Emscripten/clang/Interpreter
///            0.2.0-e7098958/.-Emscripten/clang/int linked to libethereum-1.1.1-bbb80ab0/.-Emscripten/clang/int
///            0.1.3-0/.-/clang/int linked to libethereum-0.9.92-0/.-/clang/int
///            0.1.2-5c3bfd4b*/.-/clang/int
///            0.1.1-6ff4cd6b/RelWithDebInfo-Emscripten/clang/int
/// New style: 0.4.5+commit.b318366e.Emscripten.clang
export function versionToSemver(version: string): string {
    // FIXME: parse more detail, but this is a good start
    const parsed: Array<string> = version.match(/^([0-9]+\.[0-9]+\.[0-9]+)-([0-9a-f]{8})[/*].*$/);
    if (parsed) {
        return parsed[1] + '+commit.' + parsed[2];
    }
    if (version.indexOf('0.1.3-0') !== -1) {
        return '0.1.3';
    }
    if (version.indexOf('0.3.5-0') !== -1) {
        return '0.3.5';
    }
    // assume it is already semver compatible
    return version;
}

function translateErrors(ret: any, errors: any): void {
    for (const error in errors) {
        let type: string = 'error';
        let extractType: any = /^(.*):(\d+):(\d+):(.*):/;
        extractType = extractType.exec(errors[error]);
        if (extractType) {
            type = extractType[4].trim();
        } else if (errors[error].indexOf(': Warning:')) {
            type = 'Warning';
        } else if (errors[error].indexOf(': Error:')) {
            type = 'Error';
        }
        ret.push({
            type: type,
            component: 'general',
            severity: (type === 'Warning') ? 'warning' : 'error',
            message: errors[error],
            formattedMessage: errors[error]
        });
    }
}

function translateGasEstimates(gasEstimates: any): string {
    if (gasEstimates === null) {
        return 'infinite';
    }

    if (typeof gasEstimates === 'number') {
        return gasEstimates.toString();
    }

    let gasEstimatesTranslated: string;
    for (const func in gasEstimates) {
        gasEstimatesTranslated[func] = translateGasEstimates(gasEstimates[func]);
    }
    return gasEstimatesTranslated;
}

export function translateJsonCompilerOutput(output: any, libraries: any): any {
    const ret: any = {
        errors: [],
        contracts: {},
        sources: {}
    };

    let errors: Array<string>;
    if (output.error) {
        errors = [output.error];
    } else {
        errors = output.errors;
    }
    translateErrors(ret.errors, errors);


    for (const contract in output.contracts) {
        // Split name first, can be `contract`, `:contract` or `filename:contract`
        const tmp: Array<string> = contract.match(/^(([^:]*):)?([^:]+)$/);
        if (tmp.length !== 4) {
            // Force abort
            return null;
        }
        let fileName: string = tmp[2];
        if (fileName === undefined) {
            // this is the case of `contract`
            fileName = '';
        }
        const contractName: string = tmp[3];

        const contractInput: any = output.contracts[contract];

        const gasEstimates: any = contractInput.gasEstimates;
        const translatedGasEstimates = {
            creation: {},
            internal: null,
            external: null
        };

        if (gasEstimates.creation) {
            translatedGasEstimates.creation = {
                codeDepositCost: translateGasEstimates(gasEstimates.creation[1]),
                executionCost: translateGasEstimates(gasEstimates.creation[0])
            };
        }
        if (gasEstimates.internal) {
            translatedGasEstimates.internal = translateGasEstimates(gasEstimates.internal);
        }
        if (gasEstimates.external) {
            translatedGasEstimates.external = translateGasEstimates(gasEstimates.external);
        }

        const contractOutput: any = {
            abi: JSON.parse(contractInput.interface),
            metadata: contractInput.metadata,
            evm: {
                legacyAssembly: contractInput.assembly,
                bytecode: {
                    object: contractInput.bytecode && linker.linkBytecode(contractInput.bytecode, libraries || {}),
                    opcodes: contractInput.opcodes,
                    sourceMap: contractInput.srcmap,
                    linkReferences: contractInput.bytecode && linker.findLinkReferences(contractInput.bytecode)
                },
                deployedBytecode: {
                    object: contractInput.runtimeBytecode && linker.linkBytecode(contractInput.runtimeBytecode, libraries || {}),
                    sourceMap: contractInput.srcmapRuntime,
                    linkReferences: contractInput.runtimeBytecode && linker.findLinkReferences(contractInput.runtimeBytecode)
                },
                methodIdentifiers: contractInput.functionHashes,
                gasEstimates: translatedGasEstimates
            }
        };

        if (!ret.contracts[fileName]) {
            ret.contracts[fileName] = {};
        }

        ret.contracts[fileName][contractName] = contractOutput;
    }

    const sourceMap: object = {};
    for (const sourceId in output.sourceList) {
        sourceMap[output.sourceList[sourceId]] = sourceId;
    }

    for (const source in output.sources) {
        ret.sources[source] = {
            id: sourceMap[source],
            legacyAST: output.sources[source].AST
        };
    }

    return ret;
}



export function prettyPrintLegacyAssemblyJSON(assembly, source): string {
    return formatAssemblyText(assembly, '', source);
}

