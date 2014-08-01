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
								relative: currentDir + filePath.replace(path, ''),
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
	case 'js':
		return 'application/x-javascript';
		break;
	case 'woff':
		return 'application/x-font-woff';
		break;
	case 'ttf':
		return 'application/x-font-ttf';
		break;
	case 'eot':
		return 'application/vnd.ms-fontobject';
		break;
	case 'svg':
		return 'image/svg+xml';
		break;
	case 'map':
		return 'application/octet-stream';
		break
	default:
		return 'text/'+ext;
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
	console.log(params)
	//callback(null, params)
	s3.putObject(params, function(err, data) { if (err) throw err; callback(null, params) })
}

if (bucket && path) {
	var currentDir = /\/([a-zA-Z0-9]*)$/.exec(path)[1];
	readDir(path, function(err, results){ })
	
} else console.log('node file/to/app.js bucket-name /directory/to/send/to/s3')
