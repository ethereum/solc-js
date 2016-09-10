var path = require('path');
var pwuid = require('pwuid');
var fs = require('fs-extra');
var helpers = require('./helpers')();
var MemoryStream = require('memorystream');
var https = require('https');

function compilers(repo) {
  var local= {};
  var remote= {};
  var remoteRepo = 'https://ethereum.github.io/solc-bin/bin/list.json';
  var releases=[];

  var getRepo = function() {
    var repo = null;
    if (helpers.isNode())
      repo = path.join(pwuid().dir, '.solcjs', 'bin');
    else
      repo = './bin';

    fs.ensureDirSync(repo);
    return repo;
  };

  // we get a hash: { "0.4.1": "soljson-v0.4.1+commit.4fc6fc2c.js", ... }
  function getReleaseArray(rel){
    var versions =Object.keys(rel);
    var res= [];
    for (var v in versions){

      res.push(rel[versions[v]]);
    }
    return res;
  }

  var pathExistsIn = function (path, list){
    for (var i = list.length - 1; i >= 0; i--) {
      if( list[i].path === path) return true;
    }
    return false;
  }

  var getList = function( cb) {
    console.log('Getting compilers from remote repository: ' + remoteRepo );
    // console.log('Retrieving available version list with filters', filters);

    var mem = new MemoryStream(null, { readable: false });
    https.get(remoteRepo, function(response) {
      if (response.statusCode !== 200) {
        console.log('Error downloading file: ' + response.statusCode);
        process.exit(1);
      }
      response.pipe(mem);
      response.on('end', function() {

        var json = JSON.parse(mem.toString());
        // console.log(json);

        var res = {};
        var builds = json.builds;
        res.builds = builds;

       releases = getReleaseArray(json.releases); // here we get an array

       res.getNightlies  = function(){
        var n = [];
        for (var item in builds){
          var i = builds[item];

          if (i.prerelease)
            n.push(i);
        }
        return n;
      };

      res.getReleases = function(){
        var n = [];
        
        for (var item in builds){
          var i = builds[item];

          if (releases.indexOf(i.path)>0)
            n.push(i);
        }
        return n;
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

  var getListLocal = function( cb){
    console.log('Getting compilers from your local repository: ' + repository );
    // console.log('Retrieving available version list with filters', filters);

    fs.readdir(repository, function(err, files) {
      var res = {};
      var builds=[];

      for (var f in files) {
        var file = files[f];
        var compData = helpers.extractCompilerData(file);

        builds.push( {
          path: file, 
          version: compData.version, 
          prerelease: compData.prerelease, 
          build: compData.build} );       
      }

      res.builds = builds;
      res.getNightlies  = function(){
        var n = [];
        for (var item in builds){
          var i = builds[item];

          if (i.prerelease)
            n.push(i);
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

      local = res;
      cb(err, res);
    });
  };

  repository = getRepo();

  return {
    repository: repository,
    getList: getList,
    getRepo: getRepo,
    getListLocal: getListLocal,
    pathExistsIn: pathExistsIn,
        // Use this if you want to add wrapper functions around the pure module.
        compilers: compilers
      };
    }

    module.exports = compilers;
