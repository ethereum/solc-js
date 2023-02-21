import specificSolVersion from './index';
import fs from 'fs';

const contractPath = '/Users/hack/Local/bagels-solc-js/test/resources/BasicContract.sol';

const contractAsString = getContractAsString(contractPath);

async function main() {
  const solc = await specificSolVersion('0.8.1');

  let input = {
    language: 'Solidity',
    sources: {
      ['BasicContract']: {
        content: contractAsString,
      },
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*'],
        },
      },
    },
  }

  // console.log(solc);
  let output = JSON.parse(
    solc.compile(JSON.stringify(input)),
  )

  for (let contractName in output.contracts['BasicContract']) {
    console.log('abi: ', output.contracts['BasicContract'][contractName].abi);
    console.log('bytecode: ', output.contracts['BasicContract'][contractName].evm.bytecode.object)
  }
}

main();

function getContractAsString(contractDir:string) { 
  return fs.readFileSync(contractDir).toString();
}