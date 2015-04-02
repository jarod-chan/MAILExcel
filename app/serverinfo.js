	
var db= require('./main/nedb.js');
$(function(){
	$('a[data-toggle="tab"]').on('shown', function (e) {
	  	var target_herf=$(e.target).attr("href"); 
		$("#mode").val(target_herf.substring(1));
	})

	db.find("serverinfo",function(err,data){ 
		js2form($("form").get(0), data);
		if(data.mode=="smtp"){
			$('#mytab li:eq(0) a').tab('show');
		}else{
			$('#mytab li:eq(1) a').tab('show');
		}
		
	},{mode:'smtp'});

	$('#btn_update').click(function(){
		var serverinfo=$("form").toObject();
		db.save("serverinfo",serverinfo,function(){
			$('.alert').show();
			setTimeout(function(){$('.alert-success').hide()},3000);
		})
	})
});