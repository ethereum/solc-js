import wrapper from './wrapper';
import os from 'os';

export const SOLC_INSTALLATION_DIRECTORY = os.homedir() + '/.bagels';

export default function specificSolVersion(solJsonPath?: string) {
  if (!solJsonPath) {
    // If no input passed, just return the default (whatever the package version # is)
    // Only doing this to keep the base test cases intact (this is what gets returned for those)
    const soljson = require('./soljson.js');
    return wrapper(soljson);
  }
  const soljson = require(solJsonPath);

  return wrapper(soljson);
}

// const soljson = require('./soljson.js');
// export default wrapper(soljson)