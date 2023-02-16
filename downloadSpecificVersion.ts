#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

import * as fs from 'fs';
import { https } from 'follow-redirects';
import MemoryStream from 'memorystream';
import { keccak256 } from 'js-sha3';
import { homedir } from 'os';
import path from 'path';

export function getVersionList (): Promise<any> {
  return new Promise((resolve, reject) => {
    const mem = new MemoryStream(null, { readable: false });
    
    https.get('https://binaries.soliditylang.org/bin/list.json', function (response) {
      if (response.statusCode !== 200) {
        reject('Error downloading file: ' + response.statusCode);
        process.exit(1);
      }
      response.pipe(mem);
      response.on('end', function () {
        resolve(mem.toString());
      });
    });
  })
}

function downloadBinary (outputName, version, expectedHash) {
  return new Promise((resolve, reject) => {
    // Remove if existing
    if (fs.existsSync(outputName)) {
      fs.unlinkSync(outputName);
    }
  
    process.on('SIGINT', function () {
      console.log('Interrupted, removing file.');
      fs.unlinkSync(outputName);
      reject('Interrupted')
    });
    
    const dirPath = path.dirname(outputName);
  
    // Create the folder if it doesn't already exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  
    const file = fs.createWriteStream(outputName, { encoding: 'binary' });

    https.get('https://binaries.soliditylang.org/bin/' + version, function (response) {
      if (response.statusCode !== 200) {
        console.log('Error downloading file: ' + response.statusCode);
        reject('error downloading file')
      }
      response.pipe(file);
      file.on('finish', function () {
        file.close(function () {
          const hash = '0x' + keccak256(fs.readFileSync(outputName, { encoding: 'binary' }));
          if (expectedHash !== hash) {
            reject('Hash mismatch: ' + expectedHash + ' vs ' + hash);
          }
          resolve('Done');
        });
      });
    });
  })
}

export function downloadSpecificVersion(versionWanted:string):Promise<string> { 
  return new Promise(async (resolve, reject) => {
    try {
      let list = await getVersionList();
    
      if (!list) { throw new Error('Couldnt retrieve solc-js version list')}
      list = JSON.parse(list as string);
       
      const releaseFileName = list.releases[versionWanted];
    
      const expectedFile = list.builds.filter(function (entry) { return entry.path === releaseFileName; })[0];
      if (!expectedFile) {
        console.log('Version list is invalid or corrupted?');
        process.exit(1);
      }
    
      const expectedHash = expectedFile.keccak256;
      const userHomedir = homedir();
    
      const fullPath = path.join(userHomedir, `.bagels/soljson-${versionWanted}.js`);
    
      await downloadBinary(fullPath, releaseFileName, expectedHash);
    
      resolve(fullPath);
    } catch (e) { 
      reject(e);
    }
  })
}
