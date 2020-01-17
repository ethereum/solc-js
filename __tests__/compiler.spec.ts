
import solc = require('../index.js');

function runTests (solc: any, versionText: string) {
    console.log(`Running tests with ${versionText} ${solc.version()}`);

    test('sample test', () => {
        expect(true).toBe(true);
    });
}

runTests(solc, 'latest');