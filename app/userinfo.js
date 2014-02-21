var db= require('./main/tinydb.js');
var template = Handlebars.compile($("#tr-template").html());

(function(){
	var table_operation=function(){
		this.tbody=$("#maintab tbody");
	}

	remove_row=function(){
		var tr=$(this).parents("tr:eq(0)");
		tr.remove();
		tab_op.reIndexTable();
	}

	function copytr(data){
		var tr=$(template(data));
		tr.find(".btn_remove_row").click(remove_row);
		return tr;
	};

	table_operation.prototype.reIndexTable=function(){
		var index=0;
		this.tbody.find("tr").each(function(){
			index++;
			$(this).find("td").eq(0).html(index);
		});
	}

	
	table_operation.prototype.add_datas=function(datas){
		this.tbody.empty();
		for (var i = 0; i < datas.length; i++) {
			var data=datas[i];
			tr=copytr(data);
			this.tbody.append(tr);
		};
	}
	table_operation.prototype.add=function(){
		var len=this.tbody.find("tr").size();
		var data={no:len+1};
		this.tbody.append(copytr(data));
	}
	table_operation.prototype.to_data=function(){
		var data=[],index=0;//用户邮件数组
		this.tbody.find('tr').each(function(){
			data[index]={
				no:index+1,
				user:$(this).find("input[name=user]").val(),
				email:$(this).find("input[name=email]").val()
			}
			index++;
		});
		return data;
	}

	window.tab_op=new table_operation();
})();

db.find("userinfo",function(userinfo){
	if(userinfo&&userinfo.data){
		var data=userinfo.data;
		tab_op.add_datas(data);
	}
},{});

$(function(){

	$("#btn_add_row").click(function(){
		tab_op.add();
	});

	$("#btn_save").click(function(){
		var data=tab_op.to_data();
		db.save("userinfo",{'data':data},function(){
			$('.alert').show();
			setTimeout(function(){$('.alert').hide()},3000);
		});
	});
	
})	


$(function(){
	
	$("#btn_file").click(function(){
		var file_sel=$(this).next();
		file_sel.get(0).click();
	});

	var deal_excel_array=function(array){
		if(array){
			var datas=[];
			for(var i=0;i<array.length;i++){
				datas[i]={
					no:i+1,
					user:array[i][0],
					email:array[i][1]
				};
			}
			tab_op.add_datas(datas);
		}
	}
	
	$("#hide_file").change(function(evt){
		var file = evt.target.files[0]; 
		if(file){
			var reader = new FileReader();
			reader.onload=function(e){
				var data = e.target.result;
				xlstool.xlswork(data,deal_excel_array);
			};
			reader.readAsBinaryString(file);
		};
		$(this).val('');
	});

})