var request = require('request');
var crypto = require('crypto');

var submailSender=(function () {
    this.init = function(sv){
        this.appid = sv.appid;
        this.appkey = sv.appkey;
        this.signtype = sv.signtype;
    };

    this.send = function(params,callback) {
        var api = 'https://api.submail.cn/mail/send.json';
        var requestParams = params;
        requestParams['appid'] = this.appid;
        var self = this;
        request({
            uri: 'https://api.submail.cn/service/timestamp.json',
            method: 'GET'
        }, function(error, response, body) {
            var result = JSON.parse(body);
            requestParams['timestamp'] = result["timestamp"];
            requestParams['sign_type'] = self.signtype;
            requestParams['signature'] = self.createSignature(requestParams);
            request.post({url: api, formData: requestParams}, function optionalCallback(err, httpResponse, body) {
                callback(err,body,httpResponse);
            });
        });
    };

    this.createSignature = function(params) {
        if (this.signtype == 'normal') {
            return this.appkey;
        } else {
            return this.buildSignature(params);
        }
    };

    this.buildSignature = function(params) {
        var sortedParams = this.sortOnKeys(params);
        var signStr = "";
        for(var key in sortedParams) {
            signStr += key + '=' + sortedParams[key] + '&';
        }
        signStr = signStr.substring(0, signStr.length-1);
        signStr = this.appid + this.appkey + signStr + this.appid + this.appkey;
        if (this.signtype == 'md5') {
            var md5sum = crypto.createHash('md5');
            md5sum.update(signStr);
            return md5sum.digest('hex');
        }
        if (this.signtype == 'sha1') {
            var sha1sum = crypto.createHash('sha1');
            sha1sum.update(signStr);
            return sha1sum.digest('hex');
        }
        return '';
    };

    this.sortOnKeys = function(dict) {
        var sorted = [];
        for(var key in dict) {
            if (key == 'attachments') {
                continue;
            }
            sorted[sorted.length] = key;
        }
        sorted.sort();

        var tempDict = {};
        for(var i = 0; i < sorted.length; i++) {
            tempDict[sorted[i]] = dict[sorted[i]];
        }

        return tempDict;
    };

    return this;
}());


module.exports = submailSender;
