var smtp=require('./smtpsender.js');
var sumail=require('./submailsender.js');

var sender_creater=(function(){
	this.create=function(serverinfo){
		var sender;
		if(serverinfo.mode=="smtp"){
			sender=smtp;
		}else{
			sender=sumail;
		}	
		sender.init(serverinfo);
		return sender;
	};
	return this;
}());

module.exports = sender_creater;