// var path = require('path');
var fs = require('fs-extra');
var chalk = require('chalk');

function helpers () {
  function extractCompilerData (path) {
    var res = {};
    var match = /v\d\.\d\.\d/.exec(path);
    if (match) { res.version = match[0]; }

    match = /(nightly.+)\+/.exec(path);

    if (match) {
      res.prerelease = match[1];
    }

    match = /(commit\.\w+)\./.exec(path);

    if (match) {
      res.build = match[1];
    }

    return res;
  }

  return {
    extractCompilerData: extractCompilerData,

    isNode: function () {
      return (typeof (process) !== undefined);
    },

    getSolidityCompiler: function (compilerRepo, compiler) {
      // console.log('getSolidityCompiler', compilerRepo, compiler);

      // here we get the default version of the compiler
      var solc = require('./../index.js');

      // if the user needs a specific one, we load it
      if (compiler) {
        console.log('Custom compiler requested: ' + compiler);
        // var expectedPath = path.join(compilerRepo, compiler);

        // solc = solc.setupMethods(require(expectedPath));
        console.log(compiler, compilerRepo);

        // solc = solc.useVersion(compilerRepo, helpers.getVersion(compiler));
        solc = solc.useVersion(compilerRepo, compiler);
      }
      return solc;
    },

    getSources: function (files) {
      var sources = {};

      for (var i = 0; i < files.length; i++) {
        try {
          sources[files[i]] = fs.readFileSync(files[i]).toString();
        } catch (e) {
          this.abort('Error reading ' + files[i] + ': ' + e);
        }
      }
      return sources;
    },

    abort: function (msg) {
      console.error(msg || 'Error occured');
      process.exit(1);
    },

    exit: function () {
      // console.log('Exiting...');
      process.exit(0);
    },

    printCompilationResult: function(errors) {
      var color;
      console.log('Compiled with ' + errors.length + ' issue(s)');

      for (var i = errors.length - 1; i >= 0; i--) {
        var item = errors[i];
        if (item.indexOf('Warning') > 0)
          color = chalk.yellow;
        else
          color = chalk.red;  
        console.log(color('   ' + errors[i]));
      }
    },

    // Use this if you want to add wrapper functions around the pure module.
    helpers: helpers
  };
}

module.exports = helpers;
