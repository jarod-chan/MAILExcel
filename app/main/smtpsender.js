var nodemailer = require("nodemailer");

var smtp_sender_create=(function(){
	function create_server_porp(sv){
		var ret={
		    host: sv.host,
		    //secureConnection: true, // use SSL
		    port: parseInt(sv.port), // port for secure SMTP
		    auth: {
		        user: sv.email,
		        pass: sv.password
		    }
		};
		if(sv.ssl){ret.secureConnection=true};
		return ret;
	}

	smtpTransport={};
	function init(sv){
		mail_prop=create_server_porp(sv); 
		smtpTransport = nodemailer.createTransport("SMTP",mail_prop);	   
	}
	function send(mail_option,callback){
		smtpTransport.sendMail(mail_option, callback);
	}
	return {init:init,send:send};
})();

module.exports = smtp_sender_create;