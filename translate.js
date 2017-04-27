function translateErrors (ret, errors) {
  for (var error in errors) {
    // FIXME: parse warnings here
    ret.push({
      type: 'Error',
      component: 'general',
      severity: 'error',
      message: errors[error],
      formattedMessage: errors[error]
    });
  }
}

function translateJsonCompilerOutput (output) {
  var ret = {};

  ret['errors'] = [];
  translateErrors(ret['errors'], output['errors']);

  ret['contracts'] = {};
  for (var contract in output['contracts']) {
    // Split name first, can be `contract`, `:contract` or `filename:contract`
    var tmp = contract.match(/^(([^:]*):)?([^:]+)$/);
    if (tmp.length !== 4) {
      // Force abort
      return null;
    }
    var fileName = tmp[2];
    if (fileName === undefined) {
      // this is the case of `contract`
      fileName = '';
    }
    var contractName = tmp[3];

    var contractInput = output['contracts'][contract];
    var contractOutput = {
      'abi': contractInput['interface'],
      'metadata': contractInput['metadata'],
      'evm': {
        'legacyAssembly': contractInput['assembly'],
        'bytecode': {
          'object': contractInput['bytecode'],
          'opcodes': contractInput['opcodes'],
          'sourceMap': contractInput['srcmap']
        },
        'deployedBytecode': {
          'object': contractInput['runtimeBytecode'],
          'sourceMap': contractInput['srcmapRuntime']
        },
        'methodIdentifiers': contractInput['functionHashes'],
      }
    };

    if (!ret['contracts'][fileName]) {
      ret['contracts'][fileName] = {};
    }

    ret['contracts'][fileName][contractName] = contractOutput;
  }

  if (output['formal']) {
    ret['why3'] = output['formal']['why3'];
    translateErrors(ret['errors'], output['formal']['errors']);
  }

  return ret;
}

module.exports = {
  translateJsonCompilerOutput: translateJsonCompilerOutput
};
