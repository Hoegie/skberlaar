//VERSION LIVE 1,0,1
var express    = require('express');
var mysql      = require('mysql');
var bodyParser = require('body-parser');
var apn = require('apn');
var gcm = require('node-gcm');
var nodemailer = require('nodemailer');
var ejs = require('ejs');
var fs = require('fs');
var join = require('path').join;
var http = require('http');
var path = require('path');
var connection = mysql.createConnection({
  host     : 'degronckel.synology.me', 
  //host     : '192.168.25.7',
  user     : 'root',
  password : 'Hoegaarden',
  database : 'skBerlaar'
});

var app = express();

  app.set('port', process.env.PORT || 3000);
  console.log(app.get('port'));
  app.use(bodyParser.urlencoded({ extended: false}));
  app.use(bodyParser.json());

/*Email setup*/

var transporter = nodemailer.createTransport({
          service: 'Gmail',
          auth: {
            user: 'skberlaar.app@gmail.com',
            pass: "4'Hoegaarden"
          }
});


/*IOS push message set up*/

var apnProvider = new apn.Provider({  
      token: {
          key: 'certs/apns.p8', // Path to the key p8 file
          keyId: 'AW53VE2WG7', // The Key ID of the p8 file (available at https://developer.apple.com/account/ios/certificate/key)
          teamId: '857J4HYVDU', // The Team ID of your Apple Developer Account (available at https://developer.apple.com/account/#/membership/)
      },
      production: false // Set to true if sending a notification to a production iOS app
  });  

var notification = new apn.Notification();

  notification.topic = 'be.degronckel.skBerlaar';
  notification.expiry = Math.floor(Date.now() / 1000) + 3600;
//notification.badge = 3;
  notification.sound = 'ping.aiff';
  notification.alert = 'Afgelasting !';

/*IOS push messages*/

app.get("/skberlaar/iospush/:teamid",function(req,res){
  var teamID = req.params.teamid;
  console.log(teamID);
  var connquery = "SELECT tokens.accountID, tokens.token FROM tokens LEFT JOIN accounts ON tokens.accountID = accounts.account_ID WHERE accounts.favorites REGEXP '[[:<:]]" + teamID + "[[:>:]]' AND tokens.send = 1 AND tokens.device_type = 'Apple'";
  connection.query(connquery, function(err, rows, fields) {
    if (!err){
      res.end(JSON.stringify(rows));
      console.log(rows)
      rows.forEach(function(row, i) {
          apnProvider.send(notification, row.token).then(function(result) { 
            console.log(result);
          });
      });
    }else{
      console.log('Error while performing Query.');
    }
 });
});




/*ANDROID push message setup*/

var alarmMessage = new gcm.Message();
alarmMessage.addNotification({
  title: 'SK Berlaar',
  body: 'afgelasting',
  icon: 'skberlaarlogo',
  sound: 'true'
});

var sender = new gcm.Sender('AIzaSyAqRt3-NOe1ImhUccPAJ9547WuCncAyIsU');


/*ANDROID push messages*/

app.get("/skberlaar/androidpush/:teamid",function(req,res){
var teamID = req.params.teamid;
  console.log(teamID);
  var connquery = "SELECT tokens.accountID, tokens.token FROM tokens LEFT JOIN accounts ON tokens.accountID = accounts.account_ID WHERE accounts.favorites REGEXP '[[:<:]]" + teamID + "[[:>:]]' AND tokens.send = 1 AND tokens.device_type = 'Android'";
  connection.query(connquery, function(err, rows, fields) {
    if (!err){
      res.end(JSON.stringify(rows));
      console.log(rows)
      rows.forEach(function(row, i) {
          sender.sendNoRetry(alarmMessage, { to : row.token }, function(err, response) {
        if(err) console.error(err);
        else {
          console.log(JSON.stringify(response));
        }
      });
      });
    }else{
      console.log('Error while performing Query.');
    }
 });
});




/*Email handling*/

app.put("/email/recoverpassword/:accountid",function(req,res){
var toaddress = req.body.toaddress;
var newpassword = req.body.newpassword;
var put = {
      password: req.body.hashedpassword,
      pw_recovered: 1
};
var mailOptions = {
  from: 'skberlaar.app@gmail.com',
  to: toaddress,
  subject: 'skBerlaar wachtwoord reset',
  text: 'Hallo, \n\n Je wachtwoord is gereset naar : ' + newpassword + '\n\n\n Groeten, \n skBerlaar'
};
transporter.sendMail(mailOptions, function(error, info){
    if(error){
      console.log(error);
      res.end(JSON.stringify(error));
    }else{
      console.log('Message sent: ' + info.response);
      res.end(JSON.stringify(info.response));
      connection.query('UPDATE accounts SET ? WHERE account_ID = ?',[put, req.params.accountid], function(err,result) {
        if (!err){
          console.log(result);
          res.end(JSON.stringify(result.changedRows));
        }else{
          console.log('Error while performing Query.');
        }
      });
    };
});
});


app.get("/email/test",function(req,res){

var htmltemplate = fs.readFileSync('wedstrijdblad.html',{encoding:'utf-8'});
var teams = {hometeam : 'SK BERLAAR', awayteam : 'FC HERENTHOUT', matchtype : "KAMPIOENSCHAP", departement : "U10A Gewestelijke", series : "H", gamedate : "01/05/2017", location : "SK BERLAAR", delegee : "Johan Wijns", T1 : "Sven De Gronckel", homegoals : "5", awaygoals : "2" };
var players = [
    { lastname: "De Gronckel", firstname: "Mats", goals: "2"},
    { lastname: "Ceuppers", firstname: "Ilya", goals: "1"},
    { lastname: "Mariën", firstname: "Bram", goals: "0"},
    { lastname: "", firstname: "", goals: ""},
    { lastname: "", firstname: "", goals: ""}
];
var scores = [
    { timestamp: "4", name: "Mats De Gronckel"},
    { timestamp: "6", name: "Ilya Ceuppers"},
    { timestamp: "10", name: "Mats De Gronckel"},
    { timestamp: "13", name: "Bram Mariën"},
    { timestamp: "21", name: "Ilya Ceuppers"}
];

//var htmloutput = ejs.render(htmltemplate, teams);

var htmloutput = ejs.render(htmltemplate, {
  hometeam : 'SK BERLAAR',
  awayteam : 'FC HERENTHOUT',
  matchtype : "KAMPIOENSCHAP",
  departement : "U10A Gewestelijke",
  series : "H",
  gamedate : "01/05/2017",
  location : "SK BERLAAR",
  delegee : "Johan Wijns",
  T1 : "Sven De Gronckel",
  homegoals : "5",
  awaygoals : "2",
  players: players,
  scores: scores
  });

var mailOptions = {
  from: 'pokergroupsinfo@gmail.com',
  to: 'sven.degronckel@skynet.be',
  subject: 'Wedstrijd verslag',
  text: '',
  html: htmloutput
};
transporter.sendMail(mailOptions, function(error, info){
    if(error){
      console.log(error);
      res.end(JSON.stringify(error));
    }else{
      console.log('Message sent: ' + info.response);
      res.end(JSON.stringify(info.response));
    };
});
});


app.get("/export/:eventid",function(req,res){
var eventID = req.params.eventid;
var htmltemplate = fs.readFileSync('wedstrijdblad.html',{encoding:'utf-8'});

/*matchinfoquery*/
connection.query("SELECT events.teamID, events.event_type, events.match_type, events.confirmed_players, CONVERT(DATE_FORMAT(events.date,'%d-%m-%Y'), CHAR(50)) as event_date, CONVERT(DATE_FORMAT(events.date,'%H:%i'), CHAR(50)) as event_time, COALESCE(results.homegoals, 1000) as homegoals, COALESCE(results.awaygoals, 1000) as awaygoals, CONVERT(COALESCE(concat(opponentteam.prefix, ' ', opponentteam.name), 'none'), CHAR(50)) as opponent_name, CONVERT(COALESCE(concat(opponentplace.prefix, ' ', opponentplace.name), 'none'), CHAR(50)) as event_location FROM events LEFT JOIN results ON events.event_ID = results.eventID LEFT JOIN opponents AS opponentteam ON events.opponentID = opponentteam.opponent_ID LEFT JOIN opponents AS opponentplace ON events.locationID = opponentplace.opponent_ID WHERE event_ID = ?", eventID, function(err, rows, fields) {

  if (!err){
    var teamID = rows[0].teamID;
    var confirms = "(" + rows[0].confirmed_players + ")";
    var eventTypeDB = rows[0].event_type;
    var eventDateDB = rows[0].event_date;
    var eventTimeDB = rows[0].event_time;
    var homegoalsDB = rows[0].homegoals;
    var awaygoalsDB = rows[0].awaygoals;
    var matchtypeDB = rows[0].match_type;
    var locationDB = rows[0].event_location;
    var opponentnameDB = rows[0].opponent_name;
    var hometeamDB = '';
    var awayteamDB = '';

    if (matchtypeDB == 'home'){
        hometeamDB = 'SK BERLAAR';
        awayteamDB = opponentnameDB;  
    }else{
        hometeamDB = opponentnameDB;
        awayteamDB = 'SK BERLAAR';
    }
    /*teaminfoquery*/
    connection.query('SELECT teams.team_name, teams.team_division, teams.team_series, trainer.first_name as trainer_first_name, trainer.last_name as trainer_last_name, trainer.email_address as trainer_email_address, delegee.first_name as delegee_first_name, delegee.last_name as delegee_last_name, delegee.email_address as delegee_email_address FROM teams LEFT JOIN staff as trainer ON T1_ID = trainer.staff_ID LEFT JOIN staff AS delegee ON D1_ID = delegee.staff_ID WHERE team_ID = ?', teamID, function(err, rows, fields) {
       
       if (!err){
          var teamnameDB = rows[0].team_name;
          var teamdivisionDB = rows[0].team_division;
          var teamseriesDB = rows[0].team_series;
          var trainernameDB = rows[0].trainer_first_name + " " + rows[0].trainer_last_name;
          var delegeenameDB = rows[0].delegee_first_name + " " + rows[0].delegee_last_name;
          var ccEmailAddressArray = [];
          ccEmailAddressArray.push(rows[0].trainer_email_address);
          ccEmailAddressArray.push(rows[0].delegee_email_address);

          /*playersquery*/  
          var connquery = "SELECT players.first_name as firstname, players.last_name as lastname, COALESCE((SELECT goals.goals from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + eventID + "), 0) as goals FROM players where players.player_ID IN " + confirms;
          connection.query(connquery, function(err, rows, fields) {

            if (!err){
              var players = rows;

              /*scoresquery*/
              var connquery2 = "SELECT players.first_name, players.last_name, COALESCE((SELECT goals.goals from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + eventID + "), 0) as goals, COALESCE((SELECT goals.timestamps from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + eventID + "), 'none') as timestamps FROM players where players.player_ID IN " + confirms + " AND COALESCE((SELECT goals.goals from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + eventID + "), 0) <> '0'"
              connection.query(connquery2, function(err, rows, fields) {

                if (!err){
                  
                    var scoresarray = [];
                    rows.forEach(function(row, i) {

                        var timestampstring = row.timestamps;
                        var timestamparray = timestampstring.split(",");
                        
                        timestamparray.forEach(function(timestampitem,i) {

                            var tempscoredic = {

                                timestamp: timestampitem,
                                name: row.first_name + " " + row.last_name

                            };
                            scoresarray.push(tempscoredic);

                        });
                        scoresarray.sort(function(a,b){return a.timestamp-b.timestamp});

                    }); 

                  if (players.length > scoresarray.length) {
                      //fill out the scoresarray
                      var difference =  players.length - scoresarray.length;
                      var emptyscoredic = {

                                timestamp: "",
                                name: ""

                            };
                      for (i = 0; i < difference; i++) {
                          scoresarray.push(emptyscoredic);
                      }

                  } else if (players.length < scoresarray.length) {
                      //fill out the playersarray
                      var difference =  scoresarray.length - players.length;
                      var emptyplayersdic = {
                            lastname: "",
                            firstname: "",
                            goals: ""
                      };
                      for (i = 0; i < difference; i++) {
                            players.push(emptyplayersdic);
                      }

                  }

                  var htmloutput = ejs.render(htmltemplate, {
                  hometeam : hometeamDB,
                  awayteam : awayteamDB,
                  matchtype : eventTypeDB,
                  departement : teamnameDB + " " + teamdivisionDB,
                  series : teamseriesDB,
                  gamedate : eventDateDB,
                  gametime : eventTimeDB,
                  location : locationDB,
                  delegee : delegeenameDB,
                  T1 : trainernameDB,
                  homegoals : homegoalsDB,
                  awaygoals : awaygoalsDB,
                  players: players,
                  scores: scoresarray
                  });

                  var mailOptions = {
                    from: 'skberlaar.app@gmail.com',
                    to: 'sven.degronckel@skynet.be',
                    cc: ccEmailAddressArray,
                    subject: 'Wedstrijd verslag' + ' ' + teamnameDB,
                    text: '',
                    html: htmloutput
                  };
                  transporter.sendMail(mailOptions, function(error, info){
                      if(error){
                        console.log(error);
                        res.end(JSON.stringify(error));
                      }else{
                        console.log('Message sent: ' + info.response);
                        var outputArray = [];
                        var outputDic = {
                            response: info.response
                        };
                        outputArray.push(outputDic);
                        console.log(outputArray);
                        res.end(JSON.stringify(outputDic));
                      };
                  });

                  
                }else{
                  console.log('Error while performing Query.1');
                  var outputArray = [];
              var outputDic = {
                   response: "failed"
                    };
              outputArray.push(outputDic);
              console.log(outputArray);
              res.end(JSON.stringify(outputDic)); 
                }
              });
            }else{
              console.log('Error while performing Query.2');
              var outputArray = [];
              var outputDic = {
                   response: "failed"
                    };
              outputArray.push(outputDic);
              console.log(outputArray);
              res.end(JSON.stringify(outputDic)); 
            }
          });/*playersquery*/ 
        }else{
          console.log('Error while performing Query.3');
          var outputArray = [];
              var outputDic = {
                   response: "failed"
                    };
              outputArray.push(outputDic);
              console.log(outputArray);
              res.end(JSON.stringify(outputDic)); 
        }
    });/*teaminfoquery*/
  }else{
    console.log('Error while performing Query.4');
    var outputArray = [];
              var outputDic = {
                   response: "failed"
                    };
              outputArray.push(outputDic);
              console.log(outputArray);
              res.end(JSON.stringify(outputDic)); 
  }
  });/*matchinfoquery*/
  
});

/*APN's*/

app.get("/apn/info/:accountid/:deviceid",function(req,res){
  var data = {
        accountID: req.params.accountid,
        deviceID: req.params.deviceid
    };
connection.query('SELECT COUNT(*) as controle from tokens WHERE accountID = ? AND device_ID = ?', [data.accountID, data.deviceID], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/apn/sendflag/:accountid/:deviceid",function(req,res){
  var data = {
        accountID: req.params.accountid,
        deviceID: req.params.deviceid
    };
connection.query('SELECT send from tokens WHERE accountID = ? AND device_ID = ?',[data.accountID, data.deviceID], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/apn/new",function(req,res){
  var post = {
        accountID: req.body.accountID,
        device_name: req.body.devicename,
        device_ID: req.body.deviceID,
        token: req.body.token,
        device_type: req.body.devicetype
    };
    console.log(post);
connection.query('INSERT INTO tokens SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.insertId));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/apn/:accountid/:deviceid",function(req,res){
  var put = {
        token: req.body.token
    };
    console.log(put);
connection.query('UPDATE tokens SET ? WHERE accountID = ? and device_ID = ?',[put, req.params.accountid, req.params.deviceid], function(err,result) {
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.changedRows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/apn/sendflag/:accountid/:deviceid",function(req,res){
  var put = {
        send: req.body.send
    };
    console.log(put);
connection.query('UPDATE tokens SET ? WHERE accountID = ? and device_ID = ?',[put, req.params.accountid, req.params.deviceid], function(err,result) {
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result.changedRows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*ACCOUNTS*/


app.get("/accounts/check/:email",function(req,res){
  var data = {
        email: req.params.email
    };
    console.log(data.email)
connection.query('SELECT COUNT(*) as controle from accounts WHERE email_address = ?', data.email, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/accounts/email/:email",function(req,res){
  var data = {
        email: req.params.email
    };
    console.log(data.id)
connection.query('SELECT CONVERT(accounts.account_ID,CHAR(50)) AS accountID, accounts.userroleID, accounts.name, accounts.last_name, accounts.email_address, accounts.password, accounts.pw_recovered, accounts.fblogin, accounts.fbpic_url, accounts.favorites, userroles.user_role, userroles.rights_level from accounts JOIN userroles ON accounts.userroleID = userroles.userrole_ID WHERE accounts.email_address = ?', data.email, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/accounts/new",function(req,res){
  var post = {
        name: req.body.name,
        last_name: req.body.lastname,
        email_address: req.body.emailaddress,
        password: req.body.password,
        logged_in: 1
    };
    console.log(post);
connection.query('INSERT INTO accounts SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/accounts/fbnew",function(req,res){
  var post = {
        name: req.body.name,
        last_name: req.body.lastname,
        email_address: req.body.emailaddress,
        fblogin: 1,
        fbpic_url: req.body.pictureurl,
        logged_in: 1
    };
    console.log(post);
connection.query('INSERT INTO accounts SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/accounts/fbpic/:id",function(req,res){
  var put = {
        fbpic_url: req.body.fbpicurl
    };
connection.query('UPDATE accounts SET ? WHERE account_ID = ?',[put, req.params.id], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/accounts/login/:id",function(req,res){
connection.query('UPDATE accounts SET logged_in = 1 WHERE account_ID = ?',req.params.id, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/accounts/logout/:id",function(req,res){
connection.query('UPDATE accounts SET logged_in = 0 WHERE account_ID = ?',req.params.id, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/accounts/userrole/:id",function(req,res){
  var put = {
        userroleID: req.body.userroleID
    };
connection.query('UPDATE accounts SET ? WHERE account_ID = ?',[put, req.params.id], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/accounts/newpassword/:id",function(req,res){
  var put = {
        password: req.body.password,
        pw_recovered: 0
    };
connection.query('UPDATE accounts SET ? WHERE account_ID = ?',[put, req.params.id], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/accounts/newfavorites/:id",function(req,res){
  var put = {
        favorites: req.body.favorites
    };
connection.query('UPDATE accounts SET ? WHERE account_ID = ?',[put, req.params.id], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*USER ROLES*/

app.get("/userroles/accountid/:accountid",function(req,res){
  var data = {
        accountid: req.params.accountid
    };
connection.query('SELECT userroles.user_role, userroles.userrole_ID, userroles.rights_level FROM userroles JOIN accounts ON userroles.userrole_ID = accounts.userroleID WHERE accounts.account_ID = ?', data.accountid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/userroles/all",function(req,res){
connection.query('SELECT user_role, password, userrole_ID, rights_level FROM userroles', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*TEAMS*/

app.get("/teams/all",function(req,res){
connection.query('SELECT team_ID, team_name, team_series, team_division FROM teams ORDER BY LPAD(lower(team_name), 10,0) ASC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/teams/info/:teamid",function(req,res){
connection.query('SELECT teams.team_name, staff.staff_ID, staff.first_name, staff.last_name, staff.title, staff.email_address, staff.gsm, staff.pic_url FROM teams JOIN staff ON teams.T1_ID = staff.staff_ID OR teams.D1_ID = staff.staff_ID OR teams.T2_ID = staff.staff_ID OR teams.D2_ID = staff.staff_ID or teams.Co_ID = staff.staff_ID where teams.team_ID = ?', req.params.teamid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/teams/favorites/:favorites",function(req,res){
  console.log(req.params.favorites);
  var connquery = "SELECT team_name, team_ID FROM teams WHERE team_ID IN " + req.params.favorites + " ORDER BY LPAD(lower(team_name), 10,0) ASC" ;
  console.log(connquery);
connection.query(connquery, req.params.favorites, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/teams/new",function(req,res){
  var post = {
        team_name: req.body.teamname,
        T1_ID: req.body.T1ID,
        T2_ID: req.body.T2ID,
        D1_ID: req.body.D1ID,
        D2_ID: req.body.D2ID,
        Co_ID: req.body.CoID,
        team_division: req.body.teamdivision,
        team_series: req.body.teamseries
    };
    console.log(post);
connection.query('INSERT INTO teams SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/teams/edit/:teamid",function(req,res){
  var put = {
        T1_ID: req.body.T1ID,
        T2_ID: req.body.T2ID,
        D1_ID: req.body.D1ID,
        D2_ID: req.body.D2ID,
        Co_ID: req.body.CoID,
        team_division: req.body.teamdivision,
        team_series: req.body.teamseries
    };
    console.log(put);
connection.query('UPDATE teams SET ? where team_ID = ?', [put, req.params.teamid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/teams/removestaff/:staffid",function(req,res){
connection.query('UPDATE teams SET T1_ID = IF(T1_ID = ?, 0, T1_ID), T2_ID = IF(T2_ID = ?, 0, T2_ID), D1_ID = IF(D1_ID = ?, 0, D1_ID), D2_ID = IF(D2_ID = ?, 0, D2_ID), Co_ID = IF(Co_ID = ?, 0, Co_ID)', [req.params.staffid, req.params.staffid, req.params.staffid, req.params.staffid, req.params.staffid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/teams/removeplayer/:playerid",function(req,res){
connection.query('UPDATE players SET teamID = 0 WHERE player_ID = ?', [req.params.playerid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.delete("/teams/:teamid",function(req,res){
  var data = {
        teamid: req.params.teamid
    };
    console.log(data.id);
connection.query('DELETE FROM teams WHERE team_ID = ?', data.teamid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*STAFF*/

app.get("/staff/all",function(req,res){
connection.query('SELECT * FROM staff ORDER BY last_name ASC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/staff/trainers",function(req,res){
connection.query('SELECT * FROM staff WHERE title LIKE "T%" ORDER BY last_name DESC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/staff/delegees",function(req,res){
connection.query('SELECT * FROM staff WHERE title LIKE "D%" ORDER BY last_name ASC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/staff/coordinators",function(req,res){
connection.query('SELECT * FROM staff WHERE title LIKE "C%" ORDER BY last_name ASC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/staff/new",function(req,res){
  var post = {
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        title: req.body.title,
        email_address: req.body.emailaddress,
        gsm: req.body.gsm
    };
    console.log(post);
connection.query('INSERT INTO staff SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/staff/edit/:staffid",function(req,res){
  var put = {
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        title: req.body.title,
        email_address: req.body.emailaddress,
        gsm: req.body.gsm,
        pic_url: req.body.picurl
    };
    console.log(put);
connection.query('UPDATE staff SET ? WHERE staff_ID = ?', [put, req.params.staffid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/staff/image/:staffid",function(req,res){
  var put = {
        pic_url: req.body.picurl
    };
    console.log(put);
connection.query('UPDATE staff SET ? WHERE staff_ID = ?', [put, req.params.staffid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.delete("/staff/:staffid",function(req,res){
  var data = {
        staffid: req.params.staffid
    };
    console.log(data.id);
connection.query('DELETE FROM staff WHERE staff_ID = ?', data.staffid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*PLAYERS*/

app.get("/players/all",function(req,res){
connection.query('SELECT players.*, COALESCE(teams.team_name, "No Team") as teamName FROM players LEFT JOIN teams ON players.teamID = teams.team_ID ORDER BY LPAD(lower(teamName), 10,0) ASC, players.last_name ASC', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/players/playerid/:playerid",function(req,res){
connection.query('SELECT players.*, CONVERT(DATE_FORMAT(players.birth_date,"%d-%m-%Y"), CHAR(50)) as birth_date_string, CONVERT(DATE_FORMAT(players.membership_date,"%d-%m-%Y"), CHAR(50)) as membership_date_string, COALESCE(teams.team_name, "No Team") as team_name FROM players LEFT JOIN teams ON players.teamID = teams.team_ID WHERE players.player_ID = ?', req.params.playerid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/players/teamid/:teamid",function(req,res){
connection.query('SELECT player_ID, first_name, last_name, pic_url FROM players where teamID = ?', req.params.teamid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.get("/confirmedplayers/eventid/:eventid",function(req,res){
connection.query('SELECT confirmed_players FROM events where event_ID = ?', req.params.eventid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    if (rows[0].confirmed_players != 'none'){
      var confirms = '(' + rows[0].confirmed_players + ')';
      console.log(confirms);
      var connquery = "SELECT players.player_ID, players.first_name, players.last_name, players.pic_url, CONVERT(COALESCE((SELECT goals.goals_ID from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + req.params.eventid + "), 'none'), CHAR(50)) as goals_ID, COALESCE((SELECT goals.goals from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + req.params.eventid + "), 0) as goals, COALESCE((SELECT goals.timestamps from goals WHERE goals.playerid = players.player_ID AND goals.eventID = " + req.params.eventid + "), 'none') as timestamps FROM players where players.player_ID IN " + confirms;
      console.log(connquery);
      connection.query(connquery, confirms, function(err, rows, fields) {
      /*connection.end();*/
       if (!err){
       console.log('The solution is: ', rows);
       console.log(confirms);
        res.end(JSON.stringify(rows));
        }else{
          console.log('Error while performing Query.');
        }
      }); 
    } else {
      var emptyArray = [];
      res.end(JSON.stringify(emptyArray));
    }
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/players/new",function(req,res){
  var post = {
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        birth_date: req.body.birthdate,
        birth_place: req.body.birthplace
    };
    console.log(post);
    var connquery = "INSERT INTO players SET birth_date = STR_TO_DATE('" + post.birth_date + "','%d-%m-%Y'), first_name = '" +  post.first_name + "', last_name = '" +  post.last_name + "', birth_place = '" +  post.birth_place + "'";
connection.query(connquery, post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/players/edit/:playerid",function(req,res){
  var put = {
        teamID: req.body.teamid,
        first_name: req.body.firstname,
        last_name: req.body.lastname,
        birth_place: req.body.birthplace,
        street: req.body.street,
        street_nr: req.body.streetnr,
        postal_code: req.body.postalcode,
        town: req.body.town,
        membership_nr: req.body.membershipnr
    };
    console.log(put);
connection.query("UPDATE players SET birth_date = STR_TO_DATE('" + req.body.birthdate + "', '%d-%m-%Y'), membership_date = STR_TO_DATE('" + req.body.membershipdate + "', '%d-%m-%Y'), ? WHERE player_ID = ?", [put, req.params.playerid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/players/image/:playerid",function(req,res){
  var put = {
        pic_url: req.body.picurl
    };
    console.log(put);
connection.query('UPDATE players SET ? WHERE player_ID = ?', [put, req.params.playerid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.delete("/players/:playerid",function(req,res){
  var data = {
        playerid: req.params.playerid
    };
    console.log(data.id);
connection.query('DELETE FROM players WHERE player_ID = ?', data.playerid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*PLAYERS_EMAILS*/

app.get("/playersemail/playerid/:playerid",function(req,res){
connection.query('SELECT * FROM players_emails where playerID = ?', req.params.playerid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/playersemail/new",function(req,res){
  var post = {
        playerID: req.body.playerid,
        email_address: req.body.emailaddress,
        owner: req.body.owner
    };
    console.log(post);
connection.query('INSERT INTO players_emails SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.delete("/playersemail/:emailid",function(req,res){
  var data = {
        emailid: req.params.emailid
    };
connection.query('DELETE FROM players_emails WHERE email_ID = ?', data.emailid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*PLAYERS_GSM*/

app.get("/playersgsm/playerid/:playerid",function(req,res){
connection.query('SELECT * FROM players_gsms where playerID = ?', req.params.playerid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/playersgsm/new",function(req,res){
  var post = {
        playerID: req.body.playerid,
        gsm_number: req.body.gsmnumber,
        owner: req.body.owner
    };
    console.log(post);
connection.query('INSERT INTO players_gsms SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.delete("/playersgsm/:gsmid",function(req,res){
  var data = {
        gsmid: req.params.gsmid
    };
connection.query('DELETE FROM players_gsms WHERE gsm_ID = ?', data.gsmid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});



/*EVENTS*/

app.post("/events/teamid/year/eventtype/:teamid/:year",function(req,res){
  console.log("hit");
  if (req.params.year == "Beide") {
    var yearsearchstring = "%";
  } else {
     var yearsearchstring = req.params.year;
  };
  console.log("body :");
  console.log(req.body);
  var eventtypearray = req.body.eventtypearray;
  console.log("eventtypearray :");
  console.log(eventtypearray);
  var eventtype = '(' + eventtypearray.join() + ')';
  var data = {
        teamid: req.params.teamid,
        year: yearsearchstring,
        eventtype: eventtype
  };
  console.log(data);
  var connquery = "SELECT events.event_ID, events.event_type, events.match_type, events.locationID, CONVERT(DATE_FORMAT(events.date,'%d-%m-%Y'), CHAR(50)) as event_date, CONVERT(DATE_FORMAT(events.date,'%H:%i'), CHAR(50)) as event_time, COALESCE(results.homegoals, 1000) as homegoals, COALESCE(results.awaygoals, 1000) as awaygoals, CONVERT(COALESCE(results.result_ID, 'none'), CHAR(50)) as resultID, CONVERT(COALESCE(opponentteam.prefix, 'none'), CHAR(50)) as opponent_prefix, CONVERT(COALESCE(opponentteam.name, 'none'), CHAR(50)) as opponent_name, CONVERT(COALESCE(concat(opponentplace.prefix, ' ', opponentplace.name), 'none'), CHAR(50)) as event_location, events.comments, events.dressing_room, events.annulation FROM events LEFT JOIN results ON events.event_ID = results.eventID LEFT JOIN opponents AS opponentteam ON events.opponentID = opponentteam.opponent_ID LEFT JOIN opponents AS opponentplace ON events.locationID = opponentplace.opponent_ID WHERE (events.teamID = " + data.teamid + ") AND (YEAR(events.date) LIKE '" + data.year + "') AND (events.event_type IN " + data.eventtype + ") ORDER BY events.date ASC";
  console.log(connquery);
connection.query(connquery, [data.teamid, data.year, data.eventtype], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/events/teamid/year/eventtype/android/:teamid/:year",function(req,res){
  console.log("hit");
  if (req.params.year == "Beide") {
    var yearsearchstring = "%";
  } else {
     var yearsearchstring = req.params.year;
  };
  var eventtypedic = req.body[0];
  var eventtypestring = req.body[0].eventtypearray;
  eventtypestring = eventtypestring.replace('[',"");
  eventtypestring = eventtypestring.replace(']',"");
  eventtypearray = eventtypestring.split(",");
  var eventtype = '(' + eventtypearray.join() + ')';
  var data = {
        teamid: req.params.teamid,
        year: yearsearchstring,
        eventtype: eventtype
  };
  console.log(data);
  var connquery = "SELECT events.event_ID, events.event_type, events.match_type, events.locationID, CONVERT(DATE_FORMAT(events.date,'%d-%m-%Y'), CHAR(50)) as event_date, CONVERT(DATE_FORMAT(events.date,'%H:%i'), CHAR(50)) as event_time, COALESCE(results.homegoals, 1000) as homegoals, COALESCE(results.awaygoals, 1000) as awaygoals, CONVERT(COALESCE(results.result_ID, 'none'), CHAR(50)) as resultID, CONVERT(COALESCE(opponentteam.prefix, 'none'), CHAR(50)) as opponent_prefix, CONVERT(COALESCE(opponentteam.name, 'none'), CHAR(50)) as opponent_name, CONVERT(COALESCE(concat(opponentplace.prefix, ' ', opponentplace.name), 'none'), CHAR(50)) as event_location, events.comments, events.dressing_room, events.annulation FROM events LEFT JOIN results ON events.event_ID = results.eventID LEFT JOIN opponents AS opponentteam ON events.opponentID = opponentteam.opponent_ID LEFT JOIN opponents AS opponentplace ON events.locationID = opponentplace.opponent_ID WHERE (events.teamID = " + data.teamid + ") AND (YEAR(events.date) LIKE '" + data.year + "') AND (events.event_type IN " + data.eventtype + ") ORDER BY events.date ASC";
  console.log(connquery);
connection.query(connquery, [data.teamid, data.year, data.eventtype], function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});






app.get("/events/confirmedplayers/:eventid",function(req,res){
connection.query('SELECT confirmed_players, declined_players FROM events WHERE event_ID = ?', req.params.eventid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.post("/events/new",function(req,res){
  var post = {
        teamID: req.body.teamid,
        event_type: req.body.eventtype,
        date: req.body.date,
        match_type: req.body.matchtype,
        opponentID: req.body.opponentid,
        locationID: req.body.locationid,
        comments: req.body.comments
    };
    console.log(post);
    var connquery = "INSERT INTO events SET date = STR_TO_DATE('" + post.date + "','%d-%m-%Y  %H:%i'), teamID = '" + post.teamID + "', event_type = '" + post.event_type + "', match_type = '" + post.match_type + "', opponentID = '" + post.opponentID + "', locationID = '" + post.locationID + "', comments = '" + post.comments + "'";
    console.log(connquery);
connection.query(connquery, post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/events/annulation/:eventid",function(req,res){
  var put = {
        annulation: req.body.annulation
    };
    console.log(put);
connection.query('UPDATE events SET ? WHERE event_ID = ?', [put, req.params.eventid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/events/confirmation/:eventid",function(req,res){
  var put = {
        confirmed_players: req.body.confirmedplayers,
        declined_players: req.body.declinedplayers
    };
    console.log(put);
connection.query('UPDATE events SET ? WHERE event_ID = ?', [put, req.params.eventid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/events/eventdate/:eventid",function(req,res){
  connection.query("UPDATE events SET date = STR_TO_DATE('" + req.body.date + "', '%d-%m-%Y  %H:%i') WHERE event_ID = ?", req.params.eventid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/events/comments/:eventid",function(req,res){
  var put = {
        comments: req.body.comments
    };
    console.log(put);
connection.query('UPDATE events SET ? WHERE event_ID = ?', [put, req.params.eventid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.delete("/events/:eventid",function(req,res){
  var data = {
        eventid: req.params.eventid
    };
    console.log(data.id);
connection.query('DELETE FROM events WHERE event_ID = ?', data.eventid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*OPPONENTS*/

app.get("/opponents/all",function(req,res){
connection.query('SELECT opponent_ID, concat(prefix, " ", name) as fullName FROM opponents', function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.get("/opponents/opponentid/:opponentid",function(req,res){
connection.query('SELECT *, concat(prefix, " ", name) as fullName FROM opponents where opponent_ID = ?', req.params.opponentid, function(err, rows, fields) {
/*connection.end();*/
  if (!err){
    console.log('The solution is: ', rows);
    res.end(JSON.stringify(rows));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.post("/opponents/new",function(req,res){
  var post = {
        base_nr: req.body.basenr,
        prefix: req.body.prefix,
        name: req.body.name,
        street: req.body.street,
        street_nr: req.body.streetnr,
        postal_code: req.body.postalcode,
        town: req.body.town
    };
    console.log(post);
connection.query('INSERT INTO opponents SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/opponents/opponentid/:opponentid",function(req,res){
  var put = {
        base_nr: req.body.basenr,
        prefix: req.body.prefix,
        name: req.body.name,
        street: req.body.street,
        street_nr: req.body.streetnr,
        postal_code: req.body.postalcode,
        town: req.body.town
    };
    console.log(put);
connection.query('UPDATE opponents SET ? WHERE opponent_ID = ? ', [put, req.params.opponentid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

/*GOALS*/

app.post("/goals/new",function(req,res){
  var post = {
        eventID: req.body.eventid,
        playerID: req.body.playerid,
        goals: req.body.goals,
        timestamps: req.body.timestamps
    };
    console.log(post);
connection.query('INSERT INTO goals SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.put("/goals/goalsid/:goalsid",function(req,res){
  var put = {
        goals: req.body.goals,
        timestamps: req.body.timestamps
    };
    console.log(put);
connection.query('UPDATE goals SET ? WHERE goals_ID = ? ', [put, req.params.goalsid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});

app.delete("/goals/:goalsid",function(req,res){
  var data = {
        goalsid: req.params.goalsid
    };
    console.log(data.id);
connection.query('DELETE FROM goals WHERE goals_ID = ?', data.goalsid, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


/*RESULTS*/

app.post("/results/new",function(req,res){
  var post = {
        eventID: req.body.eventid,
        homegoals: req.body.homegoals,
        awaygoals: req.body.awaygoals
    };
    console.log(post);
connection.query('INSERT INTO results SET ?', post, function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


app.put("/results/resultid/:resultid",function(req,res){
  var put = {
        homegoals: req.body.homegoals,
        awaygoals: req.body.awaygoals
    };
    console.log(put);
connection.query('UPDATE results SET ? WHERE result_ID = ? ', [put, req.params.resultid], function(err,result) {
/*connection.end();*/
  if (!err){
    console.log(result);
    res.end(JSON.stringify(result));
  }else{
    console.log('Error while performing Query.');
  }
  });
});


http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});