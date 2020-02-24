import { libraryHashPlaceholder } from './helpers';

export const linkBytecode = (bytecode: string, libraries: object): string => {
    // NOTE: for backwards compatibility support old compiler which didn't use file names
    const librariesComplete: object = {};
    for (const libraryName in libraries) {
        if (typeof libraries[libraryName] === 'object') {
            // API compatible with the standard JSON i/o
            for (const lib in libraries[libraryName]) {
                librariesComplete[lib] = libraries[libraryName][lib];
                librariesComplete[libraryName + ':' + lib] = libraries[libraryName][lib];
            }
        } else {
            // backwards compatible API for early solc-js versions
            const parsed: Array<string> = libraryName.match(/^([^:]+):(.+)$/);
            if (parsed) {
                librariesComplete[parsed[2]] = libraries[libraryName];
            }
            librariesComplete[libraryName] = libraries[libraryName];
        }
    }

    for (const libraryName in librariesComplete) {
        let hexAddress: string = librariesComplete[libraryName];
        if (hexAddress.slice(0, 2) !== '0x' || hexAddress.length > 42) {
            throw new Error('Invalid address specified for ' + libraryName);
        }
        // remove 0x prefix
        hexAddress = hexAddress.slice(2);
        hexAddress = Array(40 - hexAddress.length + 1).join('0') + hexAddress;

        // Support old (library name) and new (hash of library name)
        // placeholders.
        const replace = (name: string): void => {
            // truncate to 37 characters
            const truncatedName: string = name.slice(0, 36);
            const libLabel: string = '__' + truncatedName + Array(37 - truncatedName.length).join('_') + '__';
            while (bytecode.indexOf(libLabel) >= 0) {
                bytecode = bytecode.replace(libLabel, hexAddress);
            }
        };

        replace(libraryName);
        replace(libraryHashPlaceholder(libraryName));
    }

    return bytecode;
};

export const findLinkReferences = function (bytecode: string): any {
    // find 40 bytes in the pattern of __...<36 digits>...__
    // e.g. __Lib.sol:L_____________________________
    const linkReferences: object = {};
    let offset: number = 0;
    for (; ;) {
        const found: any = bytecode.match(/__(.{36})__/);
        if (!found) {
            break;
        }

        const start: number = found.index;
        // trim trailing underscores
        // NOTE: this has no way of knowing if the trailing underscore was part of the name
        const libraryName: string = found[1].replace(/_+$/gm, '');

        if (!linkReferences[libraryName]) {
            linkReferences[libraryName] = [];
        }

        linkReferences[libraryName].push({
            // offsets are in bytes in binary representation (and not hex)
            start: (offset + start) / 2,
            length: 20
        });

        offset += start + 20;

        bytecode = bytecode.slice(start + 20);
    }
    return linkReferences;
};
