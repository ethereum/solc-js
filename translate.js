function translateJsonCompiler (output) {
  var ret = {};

  ret['errors'] = [];
  for (var error in output['errors']) {
    // FIXME: parse warnings here
    ret['errors'].push({
      type: 'Error',
      component: 'general',
      severity: 'error',
      message: output['errors'][error],
      formattedMessage: output['errors'][error]
    });
  }

  // FIXME: translate actual output too

  return ret;
}

module.exports = {
  translateJsonCompiler: translateJsonCompiler
};
