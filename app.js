
var restify = require('restify');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var config = require('config');
var jwt = require('restify-jwt');
var mongoose = require('mongoose');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');
var twitterService = require('./Services/twitter');
var emailService = require('./Services/mail');
var request = require("request");
var format = require("stringformat");
var validator = require('validator');

var util = require('util');
var port = config.Host.port || 3000;
var host = config.Host.vdomain || 'localhost';
var serverType =  config.Host.ServerType;
var callbackOption =  config.Host.CallbackOption;
var requestType = config.Host.RequestType;
var serverID = config.Host.ServerID;
var token  = config.Services.accessToken;


var server = restify.createServer({
    name: "DVP Engagement Service"
});

server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser({ mapParams: false }));

restify.CORS.ALLOW_HEADERS.push('authorization');
server.use(restify.CORS());
server.use(restify.fullResponse());

server.use(jwt({secret: secret.Secret}));


var mongoip=config.Mongo.ip;
var mongoport=config.Mongo.port;
var mongodb=config.Mongo.dbname;
var mongouser=config.Mongo.user;
var mongopass = config.Mongo.password;



var mongoose = require('mongoose');
var connectionstring = util.format('mongodb://%s:%s@%s:%d/%s',mongouser,mongopass,mongoip,mongoport,mongodb)


mongoose.connection.on('error', function (err) {
    logger.error(err);
});

mongoose.connection.on('disconnected', function() {
    logger.error('Could not connect to database');
});

mongoose.connection.once('open', function() {
    logger.info("Connected to db");
});


mongoose.connect(connectionstring);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

server.post('DVP/API/:version/Social/Twitter', authorization({resource:"social", action:"write"}), twitterService.CreateTwitterAccount);
server.post('DVP/API/:version/Social/Twitter/:id/directmessages', authorization({resource:"social", action:"read"}), twitterService.LoadTwitterMessages);
server.get('DVP/API/:version/Social/Twitter/:id/tweets', authorization({resource:"social", action:"read"}), twitterService.LoadTweets);
server.get('DVP/API/:version/Social/Twitters', authorization({resource:"social", action:"read"}), twitterService.GetTwitterAccounts);
server.get('DVP/API/:version/Social/Twitter/:id/', authorization({resource:"social", action:"read"}), twitterService.GetTwitterAccount);
server.get('DVP/API/:version/Social/RouteMessage', authorization({resource:"social", action:"write"}), twitterService.CreateTwitterAccount);
server.post('DVP/API/:version/Social/Twitter/:id/tweets/:tid', authorization({resource:"social", action:"write"}), twitterService.ReplyTweet);
server.del('DVP/API/:version/Social/Twitter/:id', authorization({resource:"social", action:"delete"}), twitterService.DeleteTwitterAccount);
server.put('DVP/API/:version/Social/Twitter/:id', authorization({resource:"social", action:"write"}), twitterService.UpdateTwitterAccount);


server.post('DVP/API/:version/Social/Email', authorization({resource:"social", action:"write"}), emailService.CreateMailAccount);
server.get('DVP/API/:version/Social/Emails', authorization({resource:"social", action:"read"}), emailService.GetEmailAccount);
server.get('DVP/API/:version/Social/Email/:id/', authorization({resource:"social", action:"read"}), emailService.GetEmailAccounts);
server.del('DVP/API/:version/Social/Email/:id', authorization({resource:"social", action:"delete"}), emailService.DeleteEmailAccount);
server.put('DVP/API/:version/Social/Email/:id', authorization({resource:"social", action:"write"}), emailService.UpdateEmailAccount);






///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function RegisterARDS() {


 if (config.Services && config.Services.ardsServiceHost && config.Services.ardsServicePort && config.Services.ardsServiceVersion) {


  var url = format("http://{0}/DVP/API/{1}/ARDS/requestserver", config.Services.ardsServiceHost, config.Services.ardsServiceVersion);


  if (validator.isIP(config.Services.ardsServiceHost))
   url = format("http://{0}:{1}/DVP/API/{2}/ARDS/requestserver", config.Services.ardsServiceHost, config.Services.ardsServicePort, config.Services.ardsServiceVersion);


  var mainServer = format("http://{0}/DVP/API/{1}/Social/RouteMessage", config.LBServer.ip, config.Host.version);

  if (validator.isIP(config.LBServer.ip))
   mainServer = format("http://{0}:{1}/DVP/API/{2}/Social/RouteMessage", config.LBServer.ip, config.LBServer.port, config.Host.version);


  var data = {

   ServerType: serverType,
   CallbackOption: callbackOption,
   CallbackUrl: mainServer,
   RequestType: requestType,
   ServerID: serverID

  };


  request({
   method: "POST",
   url: url,
   headers: {
    authorization: "Bearer " + config.Services.accessToken
   },
   json: data
  }, function (_error, _response, datax) {

   try {

    if (!_error && _response && _response.statusCode == 200) {

     logger.debug("Successfully add to ards");

    } else {

     logger.error("Add ARDS Failed "+_error);

    }
   }
   catch (excep) {

    logger.error("Add ARDS Failed "+excep);
   }

  });


 }
}


//// http://ardsliteservice.104.131.67.21.xip.io/DVP/API/1.0.0.0/ARDS/requestserver
 server.listen(port, function () {

  logger.info("DVP-LiteTicket.main Server %s listening at %s", server.name, server.url);
  RegisterARDS();

 });

