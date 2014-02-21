	
	var db= require('./main/tinydb.js');
	$(function(){
		db.find("serverinfo",function(data){
			js2form($("form").get(0), data);
		},{});

		$('#btn_update').click(function(){
			var serverinfo=$("form").toObject();
			db.save("serverinfo",serverinfo,function(){
				$('.alert').show();
				setTimeout(function(){$('.alert').hide()},3000);
			})
		})
	});