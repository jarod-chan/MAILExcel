
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
			console.log(sender);
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
		function wrapper(row_data){
			ret={success:false};
			var no=row_data[0];
			var name=row_data[1];
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
					len:mxl_sheet.col.length,
					title:mxl_sheet.title,
					col:mxl_sheet.col.slice(1),
					row:row_data.slice(1)
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
				$("#prop_warn").show();
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
			var td=$("#maintab>tbody>tr").eq(index).find("td").eq(-2);
			if(ret.success){
				td.html(msg.on(-1));
				function callback(error, response){
					console.log(error);
					console.log(response);

				    if(error){
				    	mxl_sheet.state[index]=2;				      
				    }else{
				    	mxl_sheet.state[index]=3;
				    }
				    dbUtil.save(function(){
				    	td.html(msg.on(mxl_sheet.state[index]));	
				   		if(callnext) callnext();
				    });

				}
				mxl_sender.send(ret.mail_option,callback);
			}else{
				mxl_sheet.state[index]=1;
				dbUtil.save(function(){
					td.html(msg.on(1));
					if(callnext) callnext();
				});
			}
		}

		function send_one_row(){
			var sender_init=mxl_sender.check();
			if(!sender_init){
				alert('请先做好系统配置！');
				return;
			}
			var index=$(this).data("idx");
			send_by_index(index);
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
			
			(function(){
				$("#mode_one .btn").addClass('disabled');
				div_load.show();
				var i=0,len=mxl_sheet.data.length;
				var trs=$("#maintab>tbody>tr");
				function callnext(){
					trs.eq(i).removeClass("warning");
					if(i<len-1){
						i++;
						trs.eq(i).addClass("warning");
						send_by_index(i,callnext);
					}else{
						div_load.hide();
						$("#mode_one .btn").removeClass('disabled');
					}
				}
				trs.eq(i).addClass("warning");
				send_by_index(0,callnext);
			})();
		});

		
		//渲染数据
		function rander_table(){
			$("#title").html(mxl_sheet.title);
			var tr=$("<tr>");
			for(var i in mxl_sheet.col){
				var th=$("<th>").text(mxl_sheet.col[i]);
				tr.append(th);
			}
			tr.append($("<th>").text("信息").width(100));
			tr.append($("<th>").text("操作").width(100));
			$("#maintab>thead").html(tr);
			var tbody=$("#maintab>tbody");
			tbody.empty();
			for(var i in mxl_sheet.data){
				var dt=mxl_sheet.data[i];
				var st=mxl_sheet.state[i];
				var tr=$("<tr>");
				for(var j in dt){
					var td=$("<td>").text(dt[j]);
					tr.append(td);
				}
				tr.append($("<td>").html(msg.on(st)));
				var btn_send_one=$('<button data-idx="'+i+'" class="btn btn-small btn-primary">发送</button>');
				btn_send_one.click(send_one_row);
				tr.append($("<td>").append(btn_send_one));				
				tbody.append(tr);
			}
		}

		return{
			rander_table:rander_table
		}
	}())

	var mode_swith=(function(){
		var tby=$("#maintab>tbody");
		function one(){
			db.save("page_mode","one",function(){
				var trs=tby.find("tr");
				trs.show();
				$("#mode_one").show();
				$("#mode_two").hide();
			})
		}
		function two(){
			db.save("page_mode","two",function(){
				var trs=tby.find("tr");
				trs.hide();
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

		var tby=$("#maintab>tbody");
		function enter_no(no){
			no=$.trim(no);
			var trs=tby.find("tr");
			trs.hide();
			for(var i in mxl_sheet.data){
				var row_no=mxl_sheet.data[i][0];
				var row_name=mxl_sheet.data[i][1];
				if(row_no==no||row_name==no){
					trs.eq(i).show();
				}
			}
		}
		
		$("#btn_search_no").click(function(){
			var no=$("#input_search_no").val();
			enter_no(no);
		});


	    $('#input_search_no').typeahead({
		    source: function(query, process) { 
		      	var trs=tby.find("tr");
				trs.hide();
		        var results=new Array();
		        var index=0;
		        for(var i in mxl_sheet.data){
		         	results[index]=mxl_sheet.data[i][0];
		         	index++;
		         	results[index]=mxl_sheet.data[i][1];
		         	index++;
		         }
		         return results;
		    },
	      	highlighter: function (item) {
	      		var newitem="";
	      		for(var i in mxl_sheet.data){
		         	if(mxl_sheet.data[i][0]==item||mxl_sheet.data[i][1]==item){
		         		newitem=mxl_sheet.data[i][0]+" "+mxl_sheet.data[i][1];
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
				tby.find("tr").hide();
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

	

$(function(){
		var drop = document.getElementById('drop_div');

		
		var deal_excel_array=function(array){
			if(array){
				mxl_sheet.title=array[0][0];
				mxl_sheet.col=array[1];
				array.shift();
				array.shift();
				mxl_sheet.data=array;

				var state=new Array(array.length);
				for (var i = state.length - 1; i >= 0; i--) {
					state[i]=0;//0-等待发送 1-无邮件 2-失败 3-成功
				};
				mxl_sheet.state=state;
				dbUtil.save(function(){
					pageUtil.rander_table();
					mode_swith.one();
					$("#send_div").show();
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

