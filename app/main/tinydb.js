var Tiny=require('tiny');
var logger=require('./logger.js');
var path = require('path');
var file_path = path.dirname(process.execPath);
var dbfile=file_path+'/db.tiny';

exports.save=function(key,data,func){
	Tiny(dbfile,function(err,db){
		logger.error(err);
		db.set(key,data,function(err){
			logger.error(err);
			func();
		});
	});
}

exports.find=function (key,func,def_data){
	Tiny(dbfile,function(err,db){
		logger.error(err);
		db.get(key, function(err, data) {
		   logger.warn(err);
		   data=data?data:def_data;
		   func(data);
		});
	});
}



