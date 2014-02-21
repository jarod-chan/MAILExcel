(function(window){
	var xlstool=function(){};
	
	var workbook_to_array=function (workbook){
		XLS.SSF.load_table(workbook.SSF);
		var result = [];
		workbook.SheetNames.forEach(function(sheetName) {
			var array = XLS.utils.sheet_to_array(workbook.Sheets[sheetName]);
			if(array.length > 0){
				result=array;
			}
		});
		return result;
	}
	xlstool.prototype.xlswork=function(data, cb) {
		var worker = new Worker('lib/xls/xlsworker.js');
		worker.onmessage = function(e) {
			switch(e.data.t) {
				case 'ready': break;
				case 'e': console.error(e.data.d);
				case 'xls': 
					var array=workbook_to_array(e.data.d); 
					cb(array);
					break;
			}
		};
		worker.postMessage(data);
	}
	window.xlstool=new xlstool();
})(window)