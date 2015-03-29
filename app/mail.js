
	var async = require('async');
	var nodemailer = require("nodemailer");
	var db= require('./main/nedb.js');
	var template = Handlebars.compile($("#tab-template").html());
	
	var mxl_sheet={};//excel的数据
	var mxl_prop={}; //配置属性

	//邮件发送器
	var mxl_sender=(function(){
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
		mail_prop={};
		smtpTransport={};
		var ret={has_init:false};
		ret.init=function(){
			mail_prop=create_server_porp(mxl_prop.serverinfo); 
			smtpTransport = nodemailer.createTransport("SMTP",mail_prop);	   
			this.has_init=true;
		}
		ret.check=function(){
			return this.has_init;
		}
		ret.send=function(mail_option,callback){
			smtpTransport.sendMail(mail_option, callback);
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
			var name=row_data[0];
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
					col:mxl_sheet.col,
					row:row_data
				}
				var html=template(dt);
				mail_option={
				    from: mxl_prop.serverinfo.email, 
				    to: mail_info.email, 
				    subject: mxl_sheet.title, 
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
			mxl_prop=vals;
			mxl_sender.init();
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
			db.find("senddata",callback);
		}
		return{
			save:save,
			find:find
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

			if(btn_send.hasClass('disabled')) return;
			if(mxl_sheet.data.length==0) return;
			
			(function(){
				btn_send.addClass('disabled');
				$("#div_load").show();
				var i=0,len=mxl_sheet.data.length;
				var trs=$("#maintab>tbody>tr");
				function callnext(){
					trs.eq(i).removeClass("warning");
					if(i<len-1){
						i++;
						trs.eq(i).addClass("warning");
						send_by_index(i,callnext);
					}else{
						$("#div_load").hide();
						btn_send.removeClass('disabled');
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
	})()

	//加载页面初始数据
	$(function(){
		dbUtil.find(function(err,data){ 
			if(data){
				mxl_sheet=data;
				pageUtil.rander_table();
			}
		})
	})




	

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