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

function translateJsonCompiler (output) {
  var ret = {};

  ret['errors'] = [];
  translateErrors(ret['errors'], output['errors']);

  ret['contracts'] = {};
  for (var contract in output['contracts']) {
    // Split name first, can be `contract`, `:contract` or `filename:contract`
    var tmp = contract.match(/^([^:]*):?([^:]+)$/);
    var fileName, contractName;
    if (tmp.length === 3) {
      fileName = tmp[1];
      contractName = tmp[2];
    } else if (tmp.length === 2) {
      fileName = '';
      contractName = tmp[1];
    } else {
      // Force abort
      return null;
    }

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
        // FIXME
        'methodIdentifiers': contractInput['methodIdentifiers'],
        // FIXME translate
        'gasEstimates': contractInput['gasEstimates']
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
  translateJsonCompiler: translateJsonCompiler
};
