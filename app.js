var fs = require('fs');
var async = require('async');
var _ = require('underscore');
var compressor = require('node-minify');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./aws.json');
var s3 = new AWS.S3();

var bucket = process.argv[2];
var path = process.argv[3];

var readDir = function (dirPath, callback) {
	console.log(dirPath)
	fs.readdir(dirPath, function(err, files){
		async.series(_.map(files, function(file, index){
			var filePath = dirPath + '/' + file
			return function(callback){
				if (/^\..*/.exec(file) === null) {
					fs.stat(filePath, function(err, stats){
						if (err) throw err;
						if (stats.isDirectory()) {
							readDir(filePath, callback);
						} else {
							compress({
								ext: /\.([a-zA-Z0-9]*)$/.exec(file)[1],
								relative: currentDir + '/' + file.replace(path, ''),
								absolute: filePath,
							}, callback);
						}
					});
				} else callback(null, true);
			}
		}), function(err, results){
			callback(null, results);
		})
	});
}
var compress = function(file, callback) {
	switch (file.ext) {
	case 'css':
		console.log(file)
		new compressor.minify({
			type: 'yui-css',
			fileIn: file.absolute,
			fileOut: file.absolute,
			callback: function(err, min){
				if (err) throw err;
				processFile(file, callback);
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
				processFile(file, callback);
			}
		})
		break;
	default:
		processFile(file, callback);
	}
}

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
function processFile(file, callback) {
	fs.readFile(file.absolute, function(err, data){
		if (err) throw err;
		putObject({
			Bucket: bucket,
			Key: file.relative,
			ACL: 'public-read',
			Body: data,
			CacheControl: 'max-age=8000000',
			ContentType: guessType(file.ext),
		}, callback);
	})

}
function putObject(params, callback) {
	//console.log(params)
	//s3.putObject(params, function(err, data) { if (err) throw err; })
	callback(null, params)
}

if (bucket && path) {
	var currentDir = /\/([a-zA-Z0-9]*)$/.exec(path)[1];
	readDir(path, function(err, results){ console.log(results) })
	
} else console.log('node file/to/app.js bucket-name /directory/to/send/to/s3')
