var path = require('path');
var pwuid = require('pwuid');
var fs = require('fs-extra');
var helpers = require('./helpers')();
var MemoryStream = require('memorystream');
var https = require('https');

function compilers (repo) {
  var remoteRepo = 'https://ethereum.github.io/solc-bin/bin/list.json';
  var releases = [];
  var repository = getRepo();

  var getRepo = function () {
    var repo = null;
    if (helpers.isNode()) {
      repo = path.join(pwuid().dir, '.solcjs', 'bin');
    } else {
      repo = './bin';
    }

    fs.ensureDirSync(repo);
    return repo;
  };

    // we get a hash: { "0.4.1": "soljson-v0.4.1+commit.4fc6fc2c.js", ... }
  function getReleaseArray (rel) {
    var versions = Object.keys(rel);
    var res = [];
    for (var v in versions) {
      res.push(rel[versions[v]]);
    }
    return res;
  }

  var pathExistsIn = function (path, list) {
    for (var i = list.length - 1; i >= 0; i--) {
      if (list[i].path === path) {
        return true;
      }
    }
    return false;
  };

  var getList = function (cb) {
    // console.log('Getting compilers from remote repository: ' + remoteRepo);
    // console.log('Retrieving available version list with filters', filters);

    var mem = new MemoryStream(null, { readable: false });
    https.get(remoteRepo, function (response) {
      if (response.statusCode !== 200) {
        console.log('Error downloading file: ' + response.statusCode);
        process.exit(1);
      }
      response.pipe(mem);
      response.on('end', function () {
        var json = JSON.parse(mem.toString());
                // console.log(json);

        var res = {};
        var builds = json.builds;
        res.builds = builds;

        releases = getReleaseArray(json.releases); // here we get an array

        res.getNightlies = function () {
          var n = [];
          for (var item in builds) {
            var i = builds[item];

            if (i.prerelease) { n.push(i); }
          }
          return n;
        };

        res.getReleases = function () {
          var n = [];

          for (var item in builds) {
            var i = builds[item];

            if (releases.indexOf(i.path) > 0) { n.push(i); }
          }
          return n;
        };

        res.getRelease = function (version) {
          for (var item in builds) {
            var i = builds[item];

            if (i.version === version) { return i; }
          }
        };
        // for (var i = builds.length - 1; i >= 0; i--) {
        //   var target = builds[i].path;
        //   if (target.indexOf('nightly') > 0 && !filters.nightly) continue;

        //   res.push(target);
        //     // downloadBinary(target);
        //   }

        // });
        // } else if (argv.releases) {
        //     console.log('Getting all the releases ...');
        //     compilers.getList(function (list) {
        //       list = JSON.parse(list).releases;
        //       for (var key in list) {
        //         downloadBinary(list[key]);
        //     }
        // });
        // }
        cb(null, res);
      });
    });
  };

  function fileExists (file) {
    try {
      var stats = fs.statSync(file);
      return stats.isFile() && stats.size > 0;
    } catch (e) {
      return false;
    }
  }

  function downloadBinary (version, force, cb) {
    console.log('Downloading version ', version);
    var compilerRepo = this.getRepo();
    var targetPath = path.join(compilerRepo, version);

    if (fileExists(targetPath) && !force) {
      console.log('OK - File already there. Use --force to overwrite');
    }
    else {
      https.get('https://ethereum.github.io/solc-bin/bin/' + version, function (response) {
        if (response.statusCode !== 200) {
          console.error('Error downloading file: ' + response.statusCode);
          process.exit(1);
        }

        fs.ensureDirSync(compilerRepo);

        var file = fs.createWriteStream(targetPath);

        response.pipe(file);
        file.on('finish', function () {
          file.close(function () {
            console.log(' done');
            if (cb) cb(targetPath);
          });
        });

        var i = 0;
        file.on('drain', function () {
          if (i++ % 10 === 0) {
            process.stdout.write('.');
          }
        });
      });
    }
  }

  var getListLocal = function (cb) {
    // console.log('Getting compilers from your local repository: ' + repository);
    // console.log('Retrieving available version list with filters', filters);

    fs.readdir(repository, function (err, files) {
      var res = {};
      var builds = [];

      for (var f in files) {
        var file = files[f];
        var compData = helpers.extractCompilerData(file);

        builds.push({
          path: file,
          version: compData.version,
          prerelease: compData.prerelease,
          build: compData.build
        });
      }

      res.builds = builds;
      res.getNightlies = function () {
        var n = [];
        for (var item in builds) {
          var i = builds[item];

          if (i.prerelease) {
            n.push(i);
          }
        }
        return n;
      };

      // not sure if this is a valid way...
      // It is better to get the real data from the remote.
      //
      // res.getReleases = function(){
      //   var n = [];
      //   for (var item in builds){
      //     var i = builds[item];

      //     if (!i.prerelease)
      //       n.push(i);
      //   }
      //   return n;
      // };

      cb(err, res);
    });
  };

  return {
    repository: repository,
    getList: getList,
    getRepo: getRepo,
    getListLocal: getListLocal,
    pathExistsIn: pathExistsIn,
    downloadBinary: downloadBinary,
        // Use this if you want to add wrapper functions around the pure module.
    compilers: compilers
  };
}

module.exports = compilers;
