var express    = require('express');
var mysql      = require('mysql');
var bodyParser = require('body-parser');
//var apn = require('apn');
//var gcm = require('node-gcm');
var join = require('path').join;
var http = require('http');
var path = require('path');
/*
var connection = mysql.createConnection({
  host     : '109.135.3.222',
  //host     : '192.168.69.190',
  user     : 'mobileapp',
  password : 'exji-0lj+cNQiX$nsG',
  database : 'pants'
});

var connection2 = mysql.createConnection({
  host     : '109.135.3.222',
  //host     : '192.168.69.190',
  user     : 'mobileapp',
  password : 'exji-0lj+cNQiX$nsG',
  database : 'users'
});
*/

var app = express();

  app.set('port', process.env.PORT || 8080);
  console.log(app.get('port'));
  app.use(bodyParser.urlencoded({ extended: false}));
  app.use(bodyParser.json());


app.get("/alarms/general",function(req,res){

  res.end(JSON.stringify("test gelukt"));
  console.log("test geslaagd !");
});



http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});