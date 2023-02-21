// import specificSolVersion from '../';
const specificSol = require('../dist/index');
// const specificolVersion = require('../')
// import { getInstalledVersions } from "../index";

test('adds 1 + 2 to equal 3', () => {
  expect(1 + 2).toBe(3);
});

test('get installed versions', async () => {
  // const solc = await specificSol();
  console.log(specificSol.specificSolVersion());

  // console.log(solc.getInstalledVersions());
  expect(1 + 2).toBe(3);
});