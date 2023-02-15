import wrapper from './wrapper';

export function bagelsWrapper() { 
  // console.log('demo: switching to v0.8.17....');
  const soljson = require('./soljson.js');

  return wrapper(soljson);
}