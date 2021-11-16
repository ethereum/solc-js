import * as semver from 'semver';

import('./linker');
import('./translate');
import('./compiler');
import('./smtcallback');
import('./smtchecker');
import('./abi');

// The CLI doesn't support Node 4
if (semver.gte(process.version, '5.0.0')) {
  import('./cli');
}
