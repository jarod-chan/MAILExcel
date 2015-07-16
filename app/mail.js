
	var async = require('async');
	var db= require('./main/nedb.js');
	var template = Handlebars.compile($("#tab-template").html());

	var sender_creater=require("./main/sendercreater.js");
	
	var mxl_sheet={};//excel的数据
	var mxl_prop={}; //配置属性

	//邮件发送器
	var mxl_sender=(function(){
		var sender={};
		var ret={has_init:false};
		ret.init=function(serverinfo){   
			sender=sender_creater.create(serverinfo);
			this.has_init=true;
		}
		ret.check=function(){
			return this.has_init;
		}
		ret.send=function(mail_option,callback){
			sender.send(mail_option, callback);
		}
		return ret;
	})();

	//邮件包装器
	var mxl_wrapper=(function(){
		function find_email(emails,name){
			if(!emails) return;
			for (var i = 0; i <emails.length; i++) {
			   if(emails[i].user==name){
			     return emails[i].email;
			   }
			};
		}
		function to_send_head(arr){
			var newarr=[];
			for(var i=0,len=arr.length-1;i<len;i++){
				newarr[i]=arr[i].title;
			}
			return newarr;
		}
		function to_send_data(arr,len){
			var newarr=[];
			for(var i=0;i<len;i++){
				newarr[i]=arr["col"+i];
			}
			return newarr;
		}
		function wrapper(row_data){
			ret={success:false};
			var no=row_data.col0;
			var name=row_data.col1;
			var mail_info=function(){
				var mail=find_email(mxl_prop.userinfo,name);
				if(mail){
					return {has_email:true,email:mail}
				}else{
					return {has_email:false}
				}
			}();
			if(mail_info.has_email){
				var dt={
					len:mxl_sheet.col.length-1,
					title:mxl_sheet.title,
					col:to_send_head(mxl_sheet.col),
					row:to_send_data(row_data,mxl_sheet.col.length-1)
				}
				var html=template(dt); 
				mail_option={
				    from: mxl_prop.frommail, 
				    to: mail_info.email, 
				    subject: mxl_sheet.title+"["+name+"|"+no+"]", 
				    html: html
				}
				
				ret={
					success:true,
					mail_option:mail_option
				}
				
			}

			return ret;
		}

		return{wrapper:wrapper};
	})();


	//检查配置是否存在
	$(function(){
		async.series({
		    userinfo: function(callback) {
		    	db.find("userinfo",callback) 
		    },
		    serverinfo: function(callback) {
		    	db.find("serverinfo",callback) 
		    }
		}, 
		function(err,vals) { 
			if(!vals.userinfo || !vals.serverinfo){
				return;
			}
			mxl_prop.userinfo=vals.userinfo;
			mxl_prop.frommail=(function(serverinfo){
				if(serverinfo.mode=='smtp'){
					return serverinfo.email;
				}else{
					return serverinfo.from;
				}
			}(vals.serverinfo));
			mxl_sender.init(vals.serverinfo);
		});
	})


	var dbUtil=(function(){
		var key="senddata";
		function save(callback){
			if(!callback){
				callback=function(){};
			}
			db.save(key,mxl_sheet,callback);
		}
		function find(callback){
			if(!callback){
				callback=function(){};
			}
			db.find("senddata",callback);
		}
		function remove(callback){
			if(!callback){
				callback=function(){};
			}
			db.remove("senddata",callback);
		}
		return{
			save:save,
			find:find,
			remove:remove
		}
	})()

	// 页面渲染代码
	var pageUtil=(function(){
		var msg=(function(){
			function code_span(msg,class_str){
				var span=$('<span>');
				span.addClass("label").text(msg);
				if(class_str){span.addClass(class_str);}
				return span;
			}
			function on(code){
				switch(code){
					case -1:
						return code_span("发送中··");
					case 0:
						return code_span("等待发送");
					case 1:
						return code_span("无邮件",'label-important');
					case 2:
						return code_span("发送失败",'label-warning');
					case 3:
						return code_span("发送成功",'label-success');
				}

			}
			return {on:on}
		})();

		function send_by_index(index,callnext){  
			var row_data=mxl_sheet.data[index];
			var ret=mxl_wrapper.wrapper(row_data);
			var tr=$("#maintab>tbody>tr").eq(index);
			tr.addClass("warning");
			var td=tr.find("td").eq(-2);
			if(ret.success){ 
				td.html(msg.on(-1));
				function callback(error, response){
					console.log(error);
					console.log(response);

				    if(error||response.status=="error"){
				    	row_data.state=2;				      
				    }else{
				    	row_data.state=3;
				    }
				    dbUtil.save(function(){
				    	td.html(msg.on(row_data.state));
				    	tr.removeClass("warning");
				   		if(callnext) callnext();
				    });

				}
				mxl_sender.send(ret.mail_option,callback);
			}else{
				row_data.state=1;
				dbUtil.save(function(){
					td.html(msg.on(row_data.state));
					tr.removeClass("warning");
					if(callnext) callnext();
				});
			}
		}


		$("#btn_send").click(function(){
			var btn_send=$(this);
			var sender_init=mxl_sender.check();
			if(!sender_init){
				alert('请先做好系统配置！');
				return;
			}

			if(div_load.loading()) return;
			if(mxl_sheet.data.length==0) return;
			
			var send_span=$("#show_send_num");
			(function(){
				$("#mode_one .btn").addClass('disabled');
				div_load.show();
				var i=0,len=mxl_sheet.data.length;
				var trs=$("#maintab>tbody>tr");
				function callnext(){
					if(i<len-1){
						i++;
						send_span.html((i+1)+'/'+len);
						send_by_index(i,callnext);
					}else{
						send_span.html('');
						div_load.hide();
						$("#mode_one .btn").removeClass('disabled');
					}
				}
				send_span.html((i+1)+'/'+len);
				send_by_index(0,callnext);

			})();
		});

		var append_header=function(headarr){
			var arr=[];
			for(var i in headarr){
				arr[i]=$.extend({}, headarr[i]);  
			}	
			var len=arr.length;
			arr[len-1].formatter=function (value){
				return msg.on(value).prop('outerHTML');
			};
			arr[len-1].align='center';
			arr[len-1].width='100px';
			arr[len]={
				field:'action',
				title:'操作',
				width:'100px',
				align:'center'
				
			}
			arr[len].formatter=function(){
				return '<button class="btn_send_one btn btn-small btn-primary">发送</button>';
			};
			arr[len].events={
			    'click .btn_send_one': function (e, value, row, index) {
			        var sender_init=mxl_sender.check();
					if(!sender_init){
						alert('请先做好系统配置！');
						return;
					}
					send_by_index(index);
			    }
			};

			return arr;
		}

		
		//渲染数据
		function rander_table(){
				$("#title").html(mxl_sheet.title);
				$table
				.bootstrapTable('destroy')
				.bootstrapTable({
	        		height: getHeight(),
	        	 	columns: append_header(mxl_sheet.col),
	        	 	data: mxl_sheet.data
	        	})
	        	.bootstrapTable('resetView');
		}

		return{
			rander_table:rander_table
		}
	}())

	var mode_swith=(function(){
		
		function one(){
			db.save("page_mode","one",function(){
				$("#maintab>tbody>tr").show();
				$table.bootstrapTable('resetView');
				$("#mode_one").show();
				$("#mode_two").hide();
			})
		}
		function two(){
			db.save("page_mode","two",function(){
				$("#maintab>tbody>tr").hide();
				$("#mode_one").hide();
				$("#mode_two").show();
			})
		}		
		return{one:one,two:two};
	}())

	//加载页面初始数据
	$(function(){
		dbUtil.find(function(err,data){ 
			if(data){
				mxl_sheet=data;
				$("#drop_div").hide();
				$("#send_div").show();
				pageUtil.rander_table();
				db.find("page_mode",function(err,data){
					if(data=="one"){
						mode_swith.one();
					}else{
						mode_swith.two();
					}
					$("#send_div").show();
				},"one");
				return;				
			}else{
				$("#drop_div").show();
				mode_swith.one();
			}
		})
	})



	//表格工具条按钮
	$(function(){
		$('#msgmod .btn_yes').click(function(){
			dbUtil.remove(function(){
				$("#send_div").hide();
				$('#msgmod').modal("hide");
				$('#drop_div').show();
			});
		});
		$('#msgmod').modal({show:false});
		$("#btn_clear").click(function(){
			if($(this).is(".disabled")) return;
			$('#msgmod').modal('show');	
		});

		

		$("#btn_to_mode_two").click(function(){
			if($(this).is(".disabled")) return;
			mode_swith.two();
		})
		$("#btn_to_mode_one").click(function(){
			mode_swith.one();
		})

	
		function enter_no(no){
			no=$.trim(no);
			$("#maintab>tbody>tr").hide();
			for(var i in mxl_sheet.data){
				var row_no=mxl_sheet.data[i]['col0'];
				var row_name=mxl_sheet.data[i]['col1'];
				if(row_no==no||row_name==no){
					$table.bootstrapTable('showRow',{index: i})
					.bootstrapTable('resetView');
				}
			}
		}
		
		$("#btn_search_no").click(function(){
			var no=$("#input_search_no").val();
			enter_no(no);
		});


	    $('#input_search_no').typeahead({
		    source: function(query, process) { 
		      	$("#maintab>tbody>tr").hide();
		        var results=new Array();
		        var index=0;
		        for(var i in mxl_sheet.data){
		         	results[index]=mxl_sheet.data[i]['col0'];
		         	index++;
		         	results[index]=mxl_sheet.data[i]['col1'];
		         	index++;
		         }
		         return results;
		    },
	      	highlighter: function (item) {
	      		var newitem="";
	      		for(var i in mxl_sheet.data){
		         	if(mxl_sheet.data[i]['col0']==item||mxl_sheet.data[i]['col1']==item){
		         		newitem=mxl_sheet.data[i]['col0']+" "+mxl_sheet.data[i]['col1'];
		         		break;
		         	}
		         }
				var query = this.query.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&')
			    return newitem.replace(new RegExp('(' + query + ')', 'ig'), function ($1, match) {
			        return '<strong>' + match + '</strong>'
			    })
			},
		  updater: function(item) {
			enter_no(item);
			return item;
		  }
	   });

		$(document).bind('keyup', function(event){
	        if (event.ctrlKey&&event.keyCode=="13"){
	        	$("#input_search_no").val("").focus();
				$("#maintab>tbody>tr").hide();
	        }
	    });
	})

	var div_load=(function(){
		var btn=$("#div_load");
		var isShow=false;
		function show(){
			isShow=true;
			btn.removeClass("noshow");
		}
		function hide(){
			isShow=false;
			btn.addClass("noshow");
		}
		function loading(){
			return isShow;
		}
		return{
			show:show,
			hide:hide,
			loading:loading
		}
	}());


function getHeight() {
    return $(window).height() - 130;
};
var $table = $('#maintab');
$table.bootstrapTable({
	height: getHeight()
});
$(window).resize(function () {
	$table.bootstrapTable('resetView', {
	    height: getHeight()
	});
});









$(function(){
		var drop = document.getElementById('drop_div');


		var fmt_header=function(arr,col_num){
			var heardarr=[];
			for(var i=0;i<col_num;i++){
				heardarr[i]={};
				heardarr[i].field="col"+i;
				heardarr[i].title=arr[i];
			}
			heardarr[col_num]={field:'state',title:'信息'};
			return heardarr;
		}

		var fmt_row=function(arr,col_num){
			var rowarr={};
			for (var i=0;i<col_num;i++){
				rowarr["col"+i]=arr[i];
			}
			rowarr["state"]=0;
			return rowarr;
		}
		
		var deal_excel_array=function(array){
			if(array){
				mxl_sheet.title=array[0][0];
				mxl_sheet.col=array[1];
				array.shift();
				array.shift();
				mxl_sheet.data=array;

				var col_num=mxl_sheet.col.length;
				mxl_sheet.col=fmt_header(mxl_sheet.col,col_num);

				var len=mxl_sheet.data.length;
				for (var i=0;i<len;i++){
					mxl_sheet.data[i]=fmt_row(mxl_sheet.data[i],col_num);
				}

				dbUtil.save(function(){
					$(drop).hide();
					$("#send_div").show();
					pageUtil.rander_table();
			        mode_swith.one();
									       
				})
			}
		}

		function handleDrop(e) {
			e.stopPropagation();
			e.preventDefault();
			if($("#div_load").is(":visible")) return;
			var file = e.dataTransfer.files[0];
			if(file){
				$(this).removeClass('on_drop_div');
				var reader = new FileReader();
				reader.onload=function(e){
					var data = e.target.result;
					xlstool.xlswork(data,deal_excel_array);
				};
				reader.readAsBinaryString(file);
			};
		}

		function handleDragover(e) {
			e.stopPropagation();
			e.preventDefault();
			$(this).addClass('on_drop_div');
		}

		function handleDragleave (e) {
			e.stopPropagation();
			e.preventDefault();
			$(this).removeClass('on_drop_div');
		}

		
		drop.addEventListener('dragenter', handleDragover, false);
		drop.addEventListener('dragover', handleDragover, false);
		drop.addEventListener('drop', handleDrop, false);
		drop.addEventListener('dragleave', handleDragleave, false);
		
})



