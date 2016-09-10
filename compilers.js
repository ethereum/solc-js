var path = require('path');
var pwuid = require('pwuid');
var fs = require('fs-extra');
var helpers = require('./helpers')();
var MemoryStream = require('memorystream');
var https = require('https');

function compilers(repo) {
  var getRepo = function() {
    var repo = null;
    if (helpers.isNode())
      repo = path.join(pwuid().dir, '.solcjs', 'bin');
    else
      repo = './bin';

    fs.ensureDirSync(repo);
    return repo;
  };

  var getList = function(filters, cb) {
    console.log('Retrieving available version list with filters', filters);

    var mem = new MemoryStream(null, { readable: false });
    https.get('https://ethereum.github.io/solc-bin/bin/list.json', function(response) {
      if (response.statusCode !== 200) {
        console.log('Error downloading file: ' + response.statusCode);
        process.exit(1);
      }
      response.pipe(mem);
      response.on('end', function() {
                // if (argv.all) {
              // console.log('Getting all the versions ...');
              var json = mem.toString();
              var res = [];

              list = JSON.parse(json).builds;
              for (var i = list.length - 1; i >= 0; i--) {
                var target = list[i].path;
                if (target.indexOf('nightly') > 0 && !argv.nightly) continue;

                res.push(target);
                  // downloadBinary(target);
                }  

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
              cb(res);
            });
    });
  };

  var getListLocal = function(cb){
    console.log('Getting compilers from your local repository: <' + repository + '>');

    fs.readdir(repository, function(err, files) {
      var res = {};
      var data=[];

      for (var f in files) {
        var file = files[f];
        var compData = helpers.extractCompilerData(file);

        data.push( {
          path: file, 
          version: compData.version, 
          prerelease: compData.prerelease, 
          build: compData.build} );       
      }

      res.data = data;
      res.getNightlies = function(){
        var n = [];
        for (var item in data){
          var i = data[item];
    
          if (i.prerelease)
            n.push(i);
        }
        return n;
      };

      res.getReleases = function(){
        var n = [];
        for (var item in data){
          var i = data[item];
    
          if (!i.prerelease)
            n.push(i);
        }
        return n;
      };

      cb(err, res);
    });
  };

  repository = getRepo();

  return {
    repository: repository,
    getList: getList,
    getRepo: getRepo,
    getListLocal: getListLocal,

        // Use this if you want to add wrapper functions around the pure module.
        compilers: compilers
      };
    }

    module.exports = compilers;
