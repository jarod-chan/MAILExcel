
	var async = require('async');
	var nodemailer = require("nodemailer");
	var db= require('./main/nedb.js');
	var template = Handlebars.compile($("#tab-template").html());

	$(function(){
		function find_email(emails,name){
			if(!emails) return;
			for (var i = 0; i <emails.length; i++) {
			   if(emails[i].user==name){
			     return emails[i].email;
			   }
			};
		}

		function make_mail_list(sheet,emails){
			var ret=[];
			for(var i in sheet.data){
				var name=sheet.data[i][0];
				var email=find_email(emails,name);
				var item={has_email:false};
				if(email){
					item={
						has_email:true,
						email:email
					}
				}
				ret.push(item);
			}
			return ret;
		}



		function get_mail_data(sheet,mail_list,server_mail){
			var ret=[];
			for (var i = 0; i < mail_list.length; i++) {
				var mail_info=mail_list[i];
				var mail_option={};
				if(mail_info.has_email){
					var dt={
						len:sheet.col.length,
						title:sheet.title,
						col:sheet.col,
						row:sheet.data[i]
					}
					var html=template(dt);
					mail_option={
					    from: server_mail, 
					    to: mail_info.email, 
					    subject: sheet.title, 
					   // generateTextFromHTML : true, 
					    html: html
					}
				}

				var mail_data={
					idx:i,
					has_email:mail_info.has_email,
					mail_option:mail_option
				};
				ret.push(mail_data);
			};
			return ret;
		}

		function create_server_porp(sv){
			return {
			    host: sv.host,
			    secureConnection: true, // use SSL
			    port: parseInt(sv.port), // port for secure SMTP
			    auth: {
			        user: sv.email,
			        pass: sv.password
			    }
			};
		}


		$("#btn_send").click(function(){
			var btn_send=$(this);
			if(sheet1){
				if(btn_send.hasClass('disabled')) return;
				btn_send.toggleClass('disabled');
				$("#div_load").show();
				async.series({
				    userinfo: function(callback) {
				    	db.find("userinfo",callback) 
				    },
				    serverinfo: function(callback) {
				    	db.find("serverinfo",callback) 
				    }
				}, function(err,vals) { 
					if(!vals.userinfo || !vals.serverinfo){
						btn_send.removeClass('disabled');
						$("#div_load").hide();
						alert('请先做好系统配置！');
						return;
					}

				    var mail_list=make_mail_list(sheet1,vals.userinfo);
				    var mail_datas=get_mail_data(sheet1,mail_list,vals.serverinfo.email);
				    var mail_prop=create_server_porp(vals.serverinfo); 
				    var smtpTransport = nodemailer.createTransport("SMTP",mail_prop);
				   
				    var tby=$("#maintab>tbody>tr");
				    var chk_fun=check_finish(mail_datas.length,smtpTransport);

				    for (var i = 0; i <mail_datas.length; i++) {
				   		var item=mail_datas[i];
				   		var msg_td=tby.eq(item.idx).find("td:last");
				   		sendOneEmail(item,smtpTransport,msg_td,chk_fun,i);
				    };

				});
			}
		});

		//发送个数
		var count_num=0;
		function check_finish(len,smtpTransport){
			count_num=0;
			return function(){
				count_num++;
				if(count_num==len){
					smtpTransport.close();
					db.save("senddata",sheet1,function(){
						$("#btn_send").toggleClass('disabled');
						$("#div_load").hide();
					});
					
				}
			}
		}

		function sendOneEmail(item,smtpTransport,td,chk_fun,index){
			//校验邮件是否已经发送成功
			var st=sheet1.state[index];
			if(st==3){
				chk_fun();
				return;
			}

			if(item.has_email){
				td.html(msg.on(-1));
				smtpTransport.sendMail(item.mail_option, function(error, response){
				    if(error){
				    	sheet1.state[index]=2;
				        td.html(msg.on(2));
				    }else{
				    	sheet1.state[index]=3;
				        td.html(msg.on(3));
				    }
				    chk_fun();
				});
			}else{
				sheet1.state[index]=1;
				td.html(msg.on(1));
				chk_fun();
			}
		}

		var msg={
			on:function(code){
				var ret="";
				switch(code){
					case -1:
						ret=this.def("发送中···");
						break;
					case 0:
						ret=this.def("等待发送");
						break;
					case 1:
						ret=this.impt("无邮件");
						break;
					case 2:
						ret=this.warn("发送失败");
						break;
					case 3:
						ret=this.suce("发送成功");
						break;
				}
				return ret;
			},
			def:function(msg){
				var span=$('<span>');
				span.text(msg).addClass('label');
				return span;
			},
			suce:function(msg){
				var span=$('<span>');
				span.text(msg).addClass('label label-success');
				return span;
			},
			warn:function(msg){
				var span=$('<span>');
				span.text(msg).addClass('label label-warning');
				return span;
			},
			impt:function(msg){
				var span=$('<span>');
				span.text(msg).addClass('label label-important');
				return span;
			}

		}


		var sheet1={};//excel的数据




		//渲染数据
		function rander_table(){
			$("#title").html(sheet1.title);
			var tr=$("<tr>");
			for(var i in sheet1.col){
				var th=$("<th>").text(sheet1.col[i]);
				tr.append(th);
			}
			tr.append($("<th>").text("信息").width(100));
			$("#maintab>thead").html(tr);
			var tbody=$("#maintab>tbody");
			tbody.empty();
			for(var i in sheet1.data){
				var dt=sheet1.data[i];
				var st=sheet1.state[i];
				var tr=$("<tr>");
				for(var j in dt){
					var td=$("<td>").text(dt[j]);
					tr.append(td);
				}
				tr.append($("<td>").html(msg.on(st)));
				tbody.append(tr);
			}
		}

		var deal_excel_array=function(array){
			if(array){
				sheet1.title=array[0][0];
				sheet1.col=array[1];
				array.shift();
				array.shift();
				sheet1.data=array;

				var state=new Array(array.length);
				for (var i = state.length - 1; i >= 0; i--) {
					state[i]=0;//0-等待发送 1-无邮件 2-失败 3-成功
				};
				sheet1.state=state;


				db.save("senddata",sheet1,function(){
					rander_table();
					$("#btn_send").removeClass('disabled');
				});
			}
		}



		db.find("senddata",function(err,data){ console.info(data);
			if(data){
				sheet1=data;
				rander_table();
				$("#btn_send").removeClass('disabled');
			}
		});

		var drop = document.getElementById('drop_div');
		function handleDrop(e) {
			e.stopPropagation();
			e.preventDefault();
			if($("#div_load").is(":visible")) return;
			var file = e.dataTransfer.files[0];
			if(file){
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
			e.dataTransfer.dropEffect = 'copy';
		}

		if(drop.addEventListener) {
			drop.addEventListener('dragenter', handleDragover, false);
			drop.addEventListener('dragover', handleDragover, false);
			drop.addEventListener('drop', handleDrop, false);
		}



	})