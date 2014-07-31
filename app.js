var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var compressor = require('node-minify');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.json');
var s3 = new AWS.S3();

var bucket = process.argv[2];
var path = process.argv[3];

if (bucket && path) {
	var currentDir = /\/([a-zA-Z0-9]*)$/.exec(path)[1];

	var re = /^\..*/;
	var re1 = /\.([a-zA-Z0-9]*)$/;
	var re2 = /^(.*)\/([a-zA-Z0-9\.]*)$/;

	var walk = function(dir, done) {
		var results = [];
		fs.readdir(dir, function(err, list) {
			if (err) return done(err);
			var i = 0;
			(function next() {
				var file = list[i++];
				if (!file) return done(null, results);
				if (re.exec(file) === null) {
					file = dir + '/' + file;
					fs.stat(file, function(err, stat) {
						if (stat && stat.isDirectory()) {
							walk(file, function(err, res) {
								results = results.concat(res);
								next();
							});
						} else {
							results.push({
								ext: re1.exec(file)[1],
								relative: currentDir+file.replace(path, ''),
								absolute: file,
								dir: dir + re2.exec(file)[1].replace(path, ''),
							});
							next();
						}
					});
				} else next();
			})();
		});
	};
	walk(path, function(err, files){
		files.forEach(function(file) {
			switch (file.ext) {
			case 'css':
				new compressor.minify({
					type: 'yui-css',
					fileIn: file.absolute,
					fileOut: file.absolute,
					callback: function(err, min){
						if (err) throw err;
						processFile(file);
					}
				})
				break;
			case 'js':
				new compressor.minify({
					type: 'uglifyjs',
					fileIn: file.absolute,
					fileOut: file.absolute,
					callback: function(err, min){
						if (err) throw err;
						processFile(file);
					}
				})
				break;
			default:
				processFile(file);
			}
		})
	})

	function guessType(ext) {
		switch (ext) {
		case 'jpg':
			return 'image/jpeg';
			break;
		case 'jpeg':
			return 'image/jpeg';
			break;
		case 'png':
			return 'image/png';
			break;
		case 'gif':
			return 'image/gif';
			break;
		case 'css':
			return 'text/css';
			break;
		case 'js':
			return 'application/x-javascript';
			break;
		default:
			return 'image/jpeg';
		}
	}
	function processFile(file) {
		fs.readFile(file.absolute, function(err, data){
			putObject({
				Bucket: bucket,
				Key: file.relative,
				ACL: 'public-read',
				Body: data,
				CacheControl: 'max-age=8000000',
				ContentType: guessType(file.ext),
			});
		})
	
	}
	function putObject(params) {
		//console.log(params)
		s3.putObject(params, function(err, data) {
			if (err) throw err;
		})
	}
	
} else console.log('node file/to/app.js bucket-name /directory/to/send/to/s3')
