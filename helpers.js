var path = require('path');
var pwuid = require('pwuid');
var fs = require('fs-extra');

function helpers() {
    return {

        isNode: function() {
            return (typeof(process) !== undefined);
        },

        getVersion: function(path) {
            return path.replace('soljson-', '').replace('.js', '');
        },
        abort: function(msg) {
            console.error(msg || 'Error occured');
            process.exit(1);
        },
        getSolidityCompiler: function(compilerRepo, compiler){
        	// console.log('getSolidityCompiler', compilerRepo, compiler);

        	// here we get the default version of the compiler
        	var solc = require('./index.js');

			// if the user needs a specific one, we load it
			if (compiler){
			  console.log("Custom compiler requested: " + compiler);
			  var expectedPath = path.join(compilerRepo, compiler);

			  //solc = solc.setupMethods(require(expectedPath));
			  solc = solc.useVersion(compilerRepo, helpers.getVersion(compiler));
			  
			}
			return solc;
		}, 
		getSources: function(files){
			var sources = 		 {};

			  for (var i = 0; i < files.length; i++) {
			    try {
			      sources[ files[i] ] = fs.readFileSync(files[i]).toString();
			    } catch (e) {
			      helpers.abort('Error reading ' + files[i] + ': ' + e);
			    }
			  }
		},
		exit: function(){
			process.exit(0);
		},
		
        // Use this if you want to add wrapper functions around the pure module.
        helpers: helpers
    };
}

module.exports = helpers;
