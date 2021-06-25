#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

import pkg from '../package.json';
import { downloadBinary, getVersionList } from './helpers'

console.log('Downloading correct solidity binary...');

getVersionList((list) => {
    list = JSON.parse(list);
    const wanted: string = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
    const releaseFileName: string = list.releases[wanted];
    const expectedFile: any = list.builds.filter((entry): boolean => { return entry.path === releaseFileName; })[0];
    if (!expectedFile) {
        console.log('Version list is invalid or corrupted?');
        process.exit(1);
    }
    const expectedHash = expectedFile.keccak256;
    downloadBinary('soljson.js', releaseFileName, expectedHash);
});
