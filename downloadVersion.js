#!/usr/bin/env node

// This is used to download the correct binary version
// as part of the prepublish step.

var pkg = require('./package.json');
var fs = require('fs-extra');
var https = require('https');
var MemoryStream = require('memorystream');
var path = require('path');
var compilerDir = 'bin';

var yargs = require('yargs')
  .usage('Usage: [options| version]')
  .option('list', {
    describe: 'List all the versions',
    type: 'bool'
  })
  .option('all', {
    describe: 'Download all the versions. Additionnaly, use --nighlty to get the nightly builds.',
    type: 'bool'
  })
  .option('nightly', {
    describe: 'Combined with --all, it adds the nightly to the list',
    type: 'bool'
  })
  .option('releases', {
    describe: 'Get all the release builds',
    type: 'bool'
  })
  .option('clean', {
    describe: 'Delete all the compiler in ./bin',
    type: 'bool'
  })
  .showHelpOnFail(false, 'Specify --help for available options')
  .help();

var argv = yargs.argv;
var requestedVersion = argv._[0];

function getVersionList (cb) {
  console.log('Retrieving available version list...');

  var mem = new MemoryStream(null, { readable: false });
  https.get('https://ethereum.github.io/solc-bin/bin/list.json', function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }
    response.pipe(mem);
    response.on('end', function () {
      cb(mem.toString());
    });
  });
}

function downloadBinary (version, cb) {
  console.log('Downloading version', version);

  https.get('https://ethereum.github.io/solc-bin/bin/' + version, function (response) {
    if (response.statusCode !== 200) {
      console.log('Error downloading file: ' + response.statusCode);
      process.exit(1);
    }

    fs.ensureDirSync (compilerDir);
    var targetPath = path.join(compilerDir, version);
    var file = fs.createWriteStream(targetPath);

    response.pipe(file);
    file.on('finish', function () {
      file.close(function () {
        console.log('Done.');
        if (cb) cb(targetPath);
      });
    });
  });
}

if (argv.list) {
  console.log("Getting the list of all versions ...");
  getVersionList(function (list) {
    list = JSON.parse(list).builds;
    for (var i = list.length - 1; i >= 0; i--) {
      console.log(list[i].version, list[i].path );
    }
    process.exit(0);
  });
} else if (argv.clean) {
  console.log('Removing all local compilers in '+ compilerDir +' ...');
  fs.remove(compilerDir, function (err) {
    if (err) return console.error(err);

    console.log('Success! Cleaned ' + compilerDir);
    process.exit(0);
  });
} else if (argv.all) {
  console.log("Getting all the versions ...");
  getVersionList(function (list) {
    list =  JSON.parse(list).builds;
    for (var i = list.length - 1; i >= 0; i--) {
      var target = list[i].path;
      if (target.indexOf('nightly')>0 && !argv.nightly) continue;

      downloadBinary(target);
    }
  });
}  else if (argv.releases) {
  console.log("Getting all the releases ...");
  getVersionList(function (list) {
    list =  JSON.parse(list).releases;
    for(var key in list) {
      downloadBinary(list[key]);
    }
  });
}
else
  getVersionList(function (list) {
    list = JSON.parse(list);
    
    var wanted = null;
    if (requestedVersion) {
      console.log("Requested version: " + requestedVersion);
      wanted = requestedVersion;
    }
    else{
      console.log("Requested version: latest release");
      wanted = pkg.version.match(/^(\d+\.\d+\.\d+)$/)[1];
    }

    downloadBinary(list.releases[wanted], function(file){
      fs.copy(file, 'soljson.js'); // for backward compatibility
    });
  });
