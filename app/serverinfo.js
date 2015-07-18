	
var db= require('./main/nedb.js');
$(function(){
	$('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
	  	var target_herf=$(e.target).attr("href"); console.log(target_herf);
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
		db.save("serverinfo",serverinfo,function(){ console.log(serverinfo);
			$('#successinfo').removeClass("hide").show();
			setTimeout(function(){$('#successinfo').hide()},3000);
		})
	})
});