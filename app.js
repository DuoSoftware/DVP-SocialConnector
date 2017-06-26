var restify = require('restify');
var fs = require('fs');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var config = require('config');
var jwt = require('restify-jwt');
var mongoose = require('mongoose');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');
var twitterService = require('./Services/twitter');
var emailService = require('./Services/mail');
var smsService = require('./Services/sms');
var request = require("request");
var format = require("stringformat");
var validator = require('validator');
var fb = require('./Services/FacebookClient');

var util = require('util');
var port = config.Host.port || 3000;
var host = config.Host.vdomain || 'localhost';
var serverType = config.Host.ServerType;
var callbackOption = config.Host.CallbackOption;
var requestType = config.Host.RequestType;
var serverID = config.Host.ServerID;
var token = config.Services.accessToken;


var smsAsync = require('./Services/sms-amqp');
var twitterAsync = require('./Services/twitter-amqp');
var fbAsync = require ('./Services/FacebookClient-amqp');


restify.CORS.ALLOW_HEADERS.push('authorization');
// Setup some https server options

// Instantiate our two servers
var server = restify.createServer({
    name: "DVP Engagement Service"
});


var https_options = {
    ca: fs.readFileSync('/etc/ssl/fb/COMODORSADomainValidationSecureServerCA.crt'),
    key: fs.readFileSync('/etc/ssl/fb/SSL1.txt'),
    certificate: fs.readFileSync('/etc/ssl/fb/STAR_duoworld_com.crt')
};

var https_server = restify.createServer(https_options);


// Put any routing, response, etc. logic here. This allows us to define these functions
// only once, and it will be re-used on both the HTTP and HTTPs servers
var setup_server = function (server) {

    server.pre(restify.pre.userAgentConnection());
    server.use(restify.bodyParser({mapParams: false}));
    server.use(restify.queryParser());
    server.use(restify.CORS());
    server.use(restify.fullResponse());

    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    server.get('/', function(req, res) {
        console.log(req);
        res.send('It works!');
    });

    server.get('/facebook', function(req, res) {
        if (
            req.params.hub.mode == 'subscribe' &&
            req.params.hub.verify_token == 'token'
        ) {
            res.setHeader('content-type', 'text/plain');
            res.send(req.params.hub.challenge);
            /*res.send(req.params.hub.challenge.toString());*/
        } else {
            res.send(400);
        }
    });

    server.post('/facebook', function(req, res) {
        console.log('Facebook request body:');
        console.log(JSON.stringify(req.body));
        // Process the Facebook updates here
        fb.RealTimeUpdates(req.body);
        res.send(200);
    });

   /* server.post('/webhook', function (req, res) {
        var data = req.body;

        // Make sure this is a page subscription
        if (data.object === 'page') {

            // Iterate over each entry - there may be multiple if batched
            data.entry.forEach(function(entry) {
                var pageID = entry.id;
                var timeOfEvent = entry.time;

                // Iterate over each messaging event
                entry.messaging.forEach(function(event) {
                    if (event.message) {
                        receivedMessage(event);
                    } else {
                        console.log("Webhook received unknown event: ", event);
                    }
                });
            });

            // Assume all went well.
            //
            // You must send back a 200, within 20 seconds, to let us know
            // you've successfully received the callback. Otherwise, the request
            // will time out and we will keep trying to resend.
            res.sendStatus(200);
        }
    });

    function receivedMessage(event) {
        // Putting a stub for now, we'll expand it in the following steps
        console.log("Message data: ", event.message);
    }*/

    server.post('/instagram', function(req, res) {
        console.log('Instagram request body:');
        console.log(req.body);
        // Process the Instagram updates here
        res.send(200);
    });



};

// Now, setup both servers in one step
setup_server(https_server);

server.pre(restify.pre.userAgentConnection());
server.use(restify.bodyParser({mapParams: false}));

server.use(restify.CORS());
server.use(restify.fullResponse());
server.use(jwt({secret: secret.Secret}));




server.post('DVP/API/:version/Social/TwitterToken', authorization({
    resource: "social",
    action: "write"
}), twitterService.GetTwitterOauthToken);


server.post('DVP/API/:version/Social/Profile', authorization({
    resource: "social",
    action: "write"
}), twitterService.GetProfile);

server.post('DVP/API/:version/Social/Twitter', authorization({
    resource: "social",
    action: "write"
}), twitterService.CreateTwitterAccount);


server.post('DVP/API/:version/Social/Twitter/:id/Cron/Start', authorization({
    resource: "social",
    action: "write"
}), twitterService.TwitterStartCron);



server.post('DVP/API/:version/Social/Twitter/:id/directmessages', authorization({
    resource: "social",
    action: "read"
}), twitterService.LoadTweets);

//LoadTwitterMessages

server.get('DVP/API/:version/Social/Twitter/:id/streammessages', authorization({
    resource: "social",
    action: "read"
}), twitterService.StreamTwitterMessages);

server.get('DVP/API/:version/Social/Twitter/:id/tweets', authorization({
    resource: "social",
    action: "read"
}), twitterService.LoadTweets);
server.get('DVP/API/:version/Social/Twitters', authorization({
    resource: "social",
    action: "read"
}), twitterService.GetTwitterAccounts);
server.get('DVP/API/:version/Social/Twitter/:id/', authorization({
    resource: "social",
    action: "read"
}), twitterService.GetTwitterAccount);
server.get('DVP/API/:version/Social/RouteMessage', authorization({
    resource: "social",
    action: "write"
}), twitterService.CreateTwitterAccount);
server.post('DVP/API/:version/Social/Twitter/:id/tweets/:tid', authorization({
    resource: "social",
    action: "write"
}), twitterService.ReplyTweet);
server.del('DVP/API/:version/Social/Twitter/:id', authorization({
    resource: "social",
    action: "delete"
}), twitterService.DeleteTwitterAccount);
server.put('DVP/API/:version/Social/Twitter/:id/activate', authorization({
    resource: "social",
    action: "delete"
}), twitterService.ActivateTwitterAccount);
server.put('DVP/API/:version/Social/Twitter/:id', authorization({
    resource: "social",
    action: "write"
}), twitterService.UpdateTwitterAccount);


server.post('DVP/API/:version/Social/Email', authorization({
    resource: "social",
    action: "write"
}), emailService.CreateMailAccount);
server.get('DVP/API/:version/Social/Email', authorization({
    resource: "social",
    action: "read"
}), emailService.GetEmailAccount);
server.get('DVP/API/:version/Social/Emails', authorization({
    resource: "social",
    action: "read"
}), emailService.GetEmailAccounts);
server.del('DVP/API/:version/Social/Email/:id', authorization({
    resource: "social",
    action: "delete"
}), emailService.DeleteEmailAccount);
server.put('DVP/API/:version/Social/Email/:id', authorization({
    resource: "social",
    action: "write"
}), emailService.UpdateEmailAccount);
server.post('DVP/API/:version/Social/SMS', authorization({resource: "social", action: "write"}), smsService.SendSMS);


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


/*-----------------------------Facebook------------------------------------------*/

server.get('DVP/API/:version/Social/Facebook/accounts', authorization({
    resource: "social",
    action: "read"
}), fb.GetFacebookAccounts);

server.post('DVP/API/:version/Social/Facebook', authorization({
    resource: "social",
    action: "write"
}), fb.CreateFacebookAccount);

server.del('DVP/API/:version/Social/Facebook/:id', authorization({
    resource: "social",
    action: "write"
}), fb.DeleteFacebookAccount);

server.put('DVP/API/:version/Social/Facebook/:id', authorization({
    resource: "social",
    action: "write"
}), fb.ActiveteFacebookAccount);

server.put('DVP/API/:version/Social/Facebook/:id/picture', authorization({
    resource: "social",
    action: "write"
}), fb.UpdatePagePicture);

server.post('DVP/API/:version/Social/Facebook/:id/wallpost', authorization({
    resource: "social",
    action: "write"
}), fb.PostToWall);

server.del('DVP/API/:version/Social/Facebook/:id/item/:itemid', authorization({
    resource: "social",
    action: "write"
}), fb.RemoveItem);

server.post('DVP/API/:version/Social/Facebook/:id/comment/:objectid', authorization({
    resource: "social",
    action: "write"
}), fb.MakeCommentsToWallPost);

server.get('DVP/API/:version/Social/Facebook/:id/comments/:objectid', authorization({
    resource: "social",
    action: "write"
}), fb.GetComments);

server.get('DVP/API/:version/Social/Facebook/:id/comments/:objectid/toplevel', authorization({
    resource: "social",
    action: "write"
}), fb.GetTopLevelComments);

server.get('DVP/API/:version/Social/fb/wall/posts', authorization({
    resource: "social",
    action: "read"
}), fb.GetFbsPostList);

server.get('DVP/API/:version/Social/fb/:id/wall/posts', authorization({resource: "ticket", action: "read"}), fb.GetFbPostList);

server.post('DVP/API/:version/Social/fb/:pageId/subscribe/:verify_token/callback', authorization({
    resource: "ticket",
    action: "read"
}), fb.SubscribeToPage);


https_server.listen(443, function () {
    console.log('%s listening at %s', https_server.name, https_server.url);
});



// Start our servers to listen on the appropriate ports
server.listen(port, function () {
    logger.info("DVP-LiteTicket.main Server %s listening at %s", server.name, server.url);
    RegisterARDS();
});


var mongoip = config.Mongo.ip;
var mongoport = config.Mongo.port;
var mongodb = config.Mongo.dbname;
var mongouser = config.Mongo.user;
var mongopass = config.Mongo.password;
var mongoreplicaset=config.Mongo.replicaset;


var mongoose = require('mongoose');
var connectionstring = '';
mongoip = mongoip.split(',');
if(util.isArray(mongoip)){
 if(mongoip.length > 1){    
    mongoip.forEach(function(item){
        connectionstring += util.format('%s:%d,',item,mongoport)
    });

    connectionstring = connectionstring.substring(0, connectionstring.length - 1);
    connectionstring = util.format('mongodb://%s:%s@%s/%s',mongouser,mongopass,connectionstring,mongodb);

    if(mongoreplicaset){
        connectionstring = util.format('%s?replicaSet=%s',connectionstring,mongoreplicaset) ;
        logger.info("connectionstring ...   "+connectionstring);
    }
 }
    else
    {
        connectionstring = util.format('mongodb://%s:%s@%s:%d/%s',mongouser,mongopass,mongoip[0],mongoport,mongodb);
    }
}else {

    connectionstring = util.format('mongodb://%s:%s@%s:%d/%s', mongouser, mongopass, mongoip, mongoport, mongodb);

}
logger.info("connectionstring ...   "+connectionstring);

mongoose.connection.on('error', function (err) {
    logger.error(err);
});

mongoose.connection.on('disconnected', function () {
    logger.error('Could not connect to database');
});

mongoose.connection.once('open', function () {
    logger.info("Connected to db");
});


mongoose.connect(connectionstring);


/*-----------------------------Facebook------------------------------------------*/

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

                    logger.error("Add ARDS Failed " + _error);

                }
            }
            catch (excep) {

                logger.error("Add ARDS Failed " + excep);
            }

        });


    }
}




