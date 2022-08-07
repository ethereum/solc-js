import tape from 'tape';
import * as semver from 'semver';
import * as tmp from 'tmp';
import wrapper from '../wrapper';
import downloader from '../downloader';

const pkg = require('../package.json');

tape('Download latest binary', function (t) {
  t.test('checking whether the current version is the latest available for download', async function (st) {
    try {
      const list = JSON.parse(await downloader.getVersionList());
      const wanted = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
      if (semver.neq(wanted, list.latestRelease)) {
        st.fail(`Version ${wanted} is not the latest release ${list.latestRelease}`);
      }

      const releaseFileName = list.releases[wanted];
      const expectedFile = list.builds.filter(function (entry) { return entry.path === releaseFileName; })[0];
      if (!expectedFile) {
        st.fail(`Version ${wanted} not found. Version list is invalid or corrupted?`);
      }

      const tempDir = tmp.dirSync({ unsafeCleanup: true, prefix: 'solc-js-compiler-test-' }).name;
      const solcjsBin = `${tempDir}/${expectedFile.path}`;
      await downloader.downloadBinary(solcjsBin, releaseFileName, expectedFile.keccak256);

      const solc = wrapper(require(solcjsBin));
      if (semver.neq(solc.version(), wanted)) {
        st.fail('Downloaded version differs from package version');
      }
      st.pass(`Version ${wanted} successfully downloaded`);
    } catch (err) {
      st.fail(err.message);
    }
    st.end();
  });
});
