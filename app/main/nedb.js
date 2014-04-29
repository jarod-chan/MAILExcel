var Datastore = require('nedb')
  , path = require('path')
  , db_path=path.join(path.dirname(process.execPath), 'me.db') 
  , db = new Datastore({ filename: db_path, autoload: true  });

db.ensureIndex({ fieldName: 'key',unique: true}, function (err) {
	if(err) console.info(err);
	console.info("create data index on key field.");
}); 

exports.save=function(key,data,callback){
	if(!key) {
		console.info("param key is not valid");
		return;
	}
	if(!data){
		console.info("param data is not valid");
		return;
	}
	doc={key:key,data:data};
	db.update({ key: key},doc,{upsert:true},function (err, numReplaced,newdoc) {
		if(err){
			console.info(err);
			callback(err);
		}
		callback(null,doc.data);
	});
}

exports.find=function (key,callback,def_data){
	if(!key) {
		console.info("param key is not valid");
		return;
	}
	db.findOne({key: key}, function (err,doc) {
		if(err){
			console.info(err);
			callback(err);
		}
		var data=doc?doc.data:def_data;
		callback(null,data);
	});		
}


exports.remove=function(key,callback){
	db.remove({key:key}, {}, callback);
}


exports.all=function(callback){
	db.find({},callback);
}