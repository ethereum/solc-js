import wrapper from './wrapper';

const soljson = require('./soljson.js');
const wrapped = wrapper(soljson);

const {
  version,
  semver,
  license,
  lowlevel,
  features,
  compile,
  loadRemoteVersion,
  setupMethods
} = wrapped;

export {
  version,
  semver,
  license,
  lowlevel,
  features,
  compile,
  loadRemoteVersion,
  setupMethods
};
