/* eslint-disable @typescript-eslint/no-explicit-any */
import assert = require('assert');
import translate = require('./translate');
import requireFromString = require('require-from-string');
import https = require('https');
import MemoryStream = require("memorystream");
import semver = require('semver');
import { IncomingMessage } from 'http';

export class Wrapper {

    version: any;
    semver: any;
    license: any;
    lowlevel: any;
    features: any;
    compile: any;

    alloc?: any;
    reset?: any;
    soljson?: any;
    copyFromCString?: any;
    compileJSON?: any = null;
    compileJSONMulti?: any = null;
    compileJSONCallback?: any = null;
    compileStandard?: any = null;
    setupMethods: Wrapper;

    constructor(soljson: any) {

        if ('_solidity_version' in soljson) {
            this.version = soljson.cwrap('solidity_version', 'string', []);
        } else {
            this.version = soljson.cwrap('version', 'string', []);
        }

        if ('_solidity_license' in soljson) {
            this.license = soljson.cwrap('solidity_license', 'string', []);
        } else if ('_license' in soljson) {
            this.license = soljson.cwrap('license', 'string', []);
        } else {
            // pre 0.4.14
            this.license = (): any => {
                // return undefined
            };
        }

        if ('_solidity_alloc' in soljson) {
            this.alloc = soljson.cwrap('solidity_alloc', 'number', ['number']);
        } else {
            this.alloc = soljson._malloc;
            assert(this.alloc, 'Expected malloc to be present.');
        }

        if ('_solidity_reset' in soljson) {
            this.reset = soljson.cwrap('solidity_reset', null, []);
        }

        // This is to support multiple versions of Emscripten.
        // Take a single `ptr` and returns a `str`.
        this.copyFromCString = soljson.UTF8ToString || soljson.Pointer_stringify;

        if ('_compileJSON' in soljson) {
            // input (text), optimize (bool) -> output (jsontext)
            this.compileJSON = soljson.cwrap('compileJSON', 'string', ['string', 'number']);
        }

        if ('_compileJSONMulti' in soljson) {
            // input (jsontext), optimize (bool) -> output (jsontext)
            this.compileJSONMulti = soljson.cwrap('compileJSONMulti', 'string', ['string', 'number']);
        }

        if ('_compileJSONCallback' in soljson) {
            // input (jsontext), optimize (bool), callback (ptr) -> output (jsontext)
            const compileInternal = soljson.cwrap('compileJSONCallback', 'string', ['string', 'number', 'number']);
            this.compileJSONCallback = (input, optimize, readCallback): any => {
                return this.runWithCallbacks(readCallback, compileInternal, [input, optimize]);
            };
        }

        if ('_compileStandard' in soljson) {
            // input (jsontext), callback (ptr) -> output (jsontext)
            const compileStandardInternal = soljson.cwrap('compileStandard', 'string', ['string', 'number']);
            this.compileStandard = (input, readCallback): any => {
                return this.runWithCallbacks(readCallback, compileStandardInternal, [input]);
            };
        }

        if ('_solidity_compile' in soljson) {
            let solidityCompile;
            if (this.isVersion6) {
                // input (jsontext), callback (ptr), callback_context (ptr) -> output (jsontext)
                solidityCompile = soljson.cwrap('solidity_compile', 'string', ['string', 'number', 'number']);
            } else {
                // input (jsontext), callback (ptr) -> output (jsontext)
                solidityCompile = soljson.cwrap('solidity_compile', 'string', ['string', 'number']);
            }
            this.compileStandard = (input, callbacks): any => {
                return this.runWithCallbacks(callbacks, solidityCompile, [input]);
            };
        }
        // return {
        //     version: this.version,
        //     semver: this.versionToSemver,
        //     license: this.license,
        //     lowlevel: {
        //         compileSingle: this.compileJSON,
        //         compileMulti: this.compileJSONMulti,
        //         compileCallback: this.compileJSONCallback,
        //         compileStandard: this.compileStandard
        //     },
        //     features: {
        //         legacySingleInput: this.compileJSON !== null,
        //         multipleInputs: this.compileJSONMulti !== null || this.compileStandard !== null,
        //         importCallback: this.compileJSONCallback !== null || this.compileStandard !== null,
        //         nativeStandardJSON: this.compileStandard !== null
        //     },
        //     compile: this.compileStandardWrapper,
        //     // Loads the compiler of the given version from the github repository
        //     // instead of from the local filesystem.
        //     loadRemoteVersion: this.loadRemoteVersion,
        //     // Use this if you want to add wrapper functions around the pure module.
        //     setupMethods: this
        // };

        // Legacy
        setupMethods: this
    }

    loadRemoteVersion(versionString: string, callback: any): void {
        const mem: MemoryStream = new MemoryStream(null, { readable: false });
        const url: string = 'https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/soljson-' + versionString + '.js';
        https.get(url, (response: IncomingMessage) => {
            if (response.statusCode !== 200) {
                callback(new Error('Error retrieving binary: ' + response.statusMessage));
            } else {
                response.pipe(mem);
                response.on('end', () => {
                    callback(null, new Wrapper(requireFromString(mem.toString(), 'soljson-' + versionString + '.js')));
                });
            }
        }).on('error', (error) => {
            callback(error);
        });
    };

    versionToSemver = (): string => {
        return translate.versionToSemver(this.version());
    };

    isVersion6: boolean = semver.gt(this.versionToSemver(), '0.5.99');

    copyToCString(str: string, ptr: any): void {
        const length: number = this.soljson.lengthBytesUTF8(str);
        // This is allocating memory using solc's allocator.
        //
        // Before 0.6.0:
        //   Assuming copyToCString is only used in the context of wrapCallback, solc will free these pointers.
        //   See https://github.com/ethereum/solidity/blob/v0.5.13/libsolc/libsolc.h#L37-L40
        //
        // After 0.6.0:
        //   The duty is on solc-js to free these pointers. We accomplish that by calling `reset` at the end.
        const buffer: any = this.alloc(length + 1);
        this.soljson.stringToUTF8(str, buffer, length + 1);
        this.soljson.setValue(ptr, buffer, '*');
    };

    wrapCallback(callback: any): any {
        assert(typeof callback === 'function', 'Invalid callback specified.');
        return (data: any, contents: any, error: any): void => {
            const result: any = callback(this.copyFromCString(data));
            if (typeof result.contents === 'string') {
                this.copyToCString(result.contents, contents);
            }
            if (typeof result.error === 'string') {
                this.copyToCString(result.error, error);
            }
        };
    };

    wrapCallbackWithKind = (callback): any => {
        assert(typeof callback === 'function', 'Invalid callback specified.');
        return (context: any, kind: any, data: any, contents: any, error: any): void => {
            // Must be a null pointer.
            assert(context === 0, 'Callback context must be null.');
            const result: any = callback(this.copyFromCString(kind), this.copyFromCString(data));
            if (typeof result.contents === 'string') {
                this.copyToCString(result.contents, contents);
            }
            if (typeof result.error === 'string') {
                this.copyToCString(result.error, error);
            }
        };
    };

    // This calls compile() with args || callback
    runWithCallbacks = (callbacks: any, compile: any, args: any): any => {
        if (callbacks) {
            assert(typeof callbacks === 'object', 'Invalid callback object specified.');
        } else {
            callbacks = {};
        }

        let readCallback: any = callbacks.import;
        if (readCallback === undefined) {
            readCallback = (): any => {
                return {
                    error: 'File import callback not supported'
                };
            };
        }

        let singleCallback: any;
        if (this.isVersion6) {
            // After 0.6.x multiple kind of callbacks are supported.
            let smtSolverCallback: any = callbacks.smtSolver;
            if (smtSolverCallback === undefined) {
                smtSolverCallback = (): any => {
                    return {
                        error: 'SMT solver callback not supported'
                    };
                };
            }

            singleCallback = (kind: string, data): any => {
                if (kind === 'source') {
                    return readCallback(data);
                } else if (kind === 'smt-query') {
                    return smtSolverCallback(data);
                } else {
                    assert(false, 'Invalid callback kind specified.');
                }
            };

            singleCallback = this.wrapCallbackWithKind(singleCallback);
        } else {
            // Old Solidity version only supported imports.
            singleCallback = this.wrapCallback(readCallback);
        }

        // This is to support multiple versions of Emscripten.
        const addFunction: any = this.soljson.addFunction || this.soljson.Runtime.addFunction;
        const removeFunction: any = this.soljson.removeFunction || this.soljson.Runtime.removeFunction;

        const callback: any = addFunction(singleCallback);
        let output: any;
        try {
            args.push(callback);
            if (this.isVersion6) {
                // Callback context.
                args.push(null);
            }
            output = compile(...args);
        } catch (e) {
            removeFunction(callback);
            throw e;
        }
        removeFunction(callback);
        if (this.reset) {
            // Explicitly free memory.
            //
            // NOTE: cwrap() of "compile" will copy the returned pointer into a
            //       Javascript string and it is not possible to call free() on it.
            //       reset() however will clear up all allocations.
            this.reset();
        }
        return output;
    };

    // Expects a Standard JSON I/O but supports old compilers
    compileStandardWrapper = (input: any, readCallback: any): any => {
        if (this.compileStandard !== null) {
            return this.compileStandard(input, readCallback);
        }

        function formatFatalError(message: string): string {
            return JSON.stringify({
                errors: [
                    {
                        type: 'JSONError',
                        component: 'solcjs',
                        severity: 'error',
                        message: message,
                        formattedMessage: 'Error: ' + message
                    }
                ]
            });
        }

        try {
            input = JSON.parse(input);
        } catch (e) {
            return formatFatalError('Invalid JSON supplied: ' + e.message);
        }

        if (input.language !== 'Solidity') {
            return formatFatalError('Only "Solidity" is supported as a language.');
        }

        // NOTE: this is deliberately `== null`
        if (input.sources == null || input.sources.length === 0) {
            return formatFatalError('No input sources specified.');
        }

        function isOptimizerEnabled(input: any): any {
            return input.settings && input.settings.optimizer && input.settings.optimizer.enabled;
        }

        function translateSources(input: any): object {
            const sources: object = {};
            for (const source in input.sources) {
                if (input.sources[source].content !== null) {
                    sources[source] = input.sources[source].content;
                } else {
                    // force failure
                    return null;
                }
            }
            return sources;
        }

        function librariesSupplied(input: any): any {
            if (input.settings) {
                return input.settings.libraries;
            }
        }

        function translateOutput(output: any, libraries: any): string {
            try {
                output = JSON.parse(output);
            } catch (e) {
                return formatFatalError('Compiler returned invalid JSON: ' + e.message);
            }
            output = translate.translateJsonCompilerOutput(output, libraries);
            if (output == null) {
                return formatFatalError('Failed to process output.');
            }
            return JSON.stringify(output);
        }

        const sources: object = translateSources(input);
        if (sources === null || Object.keys(sources).length === 0) {
            return formatFatalError('Failed to process sources.');
        }

        // Try linking if libraries were supplied
        const libraries: any = librariesSupplied(input);

        // Try to wrap around old versions
        if (this.compileJSONCallback !== null) {
            return translateOutput(this.compileJSONCallback(JSON.stringify({ sources: sources }), isOptimizerEnabled(input), readCallback), libraries);
        }

        if (this.compileJSONMulti !== null) {
            return translateOutput(this.compileJSONMulti(JSON.stringify({ sources: sources }), isOptimizerEnabled(input)), libraries);
        }

        // Try our luck with an ancient compiler
        if (this.compileJSON !== null) {
            if (Object.keys(sources).length !== 1) {
                return formatFatalError('Multiple sources provided, but compiler only supports single input.');
            }
            return translateOutput(this.compileJSON(sources[Object.keys(sources)[0]], isOptimizerEnabled(input)), libraries);
        }

        return formatFatalError('Compiler does not support any known interface.');
    };
}
