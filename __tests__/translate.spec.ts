import fs = require('fs');
import path = require('path');
import translate = require('../src/translate');
const versionToSemver = translate.versionToSemver;


describe('Version string to Semver translator', () => {
    test('Only numbers', () => {
        expect(versionToSemver('0.1.0')).toEqual('0.1.0');
    });
    test('New style release (semver)', () => {
        expect(versionToSemver('0.4.5+commit.b318366e.Emscripten.clang')).toEqual('0.4.5+commit.b318366e.Emscripten.clang');
    });
    test('New style nightly (semver)', () => {
        expect(versionToSemver('0.4.20-nightly.2018.2.13+commit.27ef9794.Emscripten.clang')).toEqual('0.4.20-nightly.2018.2.13+commit.27ef9794.Emscripten.clang');
    });
    test('Old style 0.1.1', () => {
        expect(versionToSemver('0.1.1-6ff4cd6b/RelWithDebInfo-Emscripten/clang/int')).toEqual('0.1.1+commit.6ff4cd6b');
    });
    test('Old style 0.1.2', () => {
        expect(versionToSemver('0.1.2-5c3bfd4b*/.-/clang/int')).toEqual('0.1.2+commit.5c3bfd4b');
    });
    test('Broken 0.1.3', () => {
        expect(versionToSemver('0.1.3-0/.-/clang/int linked to libethereum-0.9.92-0/.-/clang/int')).toEqual('0.1.3');
    });
    test('Old style 0.2.0', () => {
        expect(
            versionToSemver('0.2.0-e7098958/.-Emscripten/clang/int linked to libethereum-1.1.1-bbb80ab0/.-Emscripten/clang/int'))
            .toEqual('0.2.0+commit.e7098958');
    });
    test('Old style 0.3.5', () => {
        // The one in the solc-bin list
        expect(versionToSemver('0.3.5-371690f0/Release-Emscripten/clang/Interpreter')).toEqual('0.3.5+commit.371690f0');
        // The actual one reported by the compiler
        expect(versionToSemver('0.3.5-0/Release-Emscripten/clang/Interpreter')).toEqual('0.3.5');
    });
    test('Old style 0.3.6', () => {
        expect(versionToSemver('0.3.6-3fc68da5/Release-Emscripten/clang')).toEqual('0.3.6+commit.3fc68da5');
    });
});

describe('prettyPrintLegacyAssemblyJSON', () => {
    test('Works properly', () => {
        let fixtureAsmJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'resources/fixtureAsmJson.json')).toString());
        let fixtureAsmJsonSource = fs.readFileSync(path.resolve(__dirname, 'resources/fixtureAsmJson.sol')).toString();
        let fixtureAsmJsonOutput = fs.readFileSync(path.resolve(__dirname, 'resources/fixtureAsmJson.output')).toString();
        expect(translate.prettyPrintLegacyAssemblyJSON(fixtureAsmJson, fixtureAsmJsonSource)).toEqual(fixtureAsmJsonOutput);
    });
});
