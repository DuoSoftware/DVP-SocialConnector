var amqp = require('amqp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var request = require('request');
var format = require("stringformat");
var CreateEngagement = require('../Workers/common').CreateEngagement;
var CreateComment = require('../Workers/common').CreateComment;
var CreateTicket = require('../Workers/common').CreateTicket;
var config = require('config');
var validator = require('validator');
var dust = require('dustjs-linkedin');
var juice = require('juice');
var Template = require('../Model/Template').Template;
var uuid = require('node-uuid');
var SocialConnector = require('dvp-mongomodels/model/SocialConnector').SocialConnector;

var queueHost = format('amqp://{0}:{1}@{2}:{3}',config.RabbitMQ.user,config.RabbitMQ.password,config.RabbitMQ.ip,config.RabbitMQ.port);
var queueName = config.Host.facebookQueueName;



var queueConnection = amqp.createConnection({
    url: queueHost
});

queueConnection.on('ready', function () {
    queueConnection.queue(queueName, {durable: true, autoDelete: false},function (q) {
        q.bind('#');
        q.subscribe({
            ack: true,
            prefetchCount: 10
        }, function (message, headers, deliveryInfo, ack) {

            //message = JSON.parse(message.data.toString());
            console.log(message);
            if (!message || !message.to || !message.from || !message.reply_session ||  !message.body || !message.company || !message.tenant) {
                console.log('FB Client AMQP-Invalid message, skipping');
                return ack.acknowledge();
            }
            ///////////////////////////create body/////////////////////////////////////////////////

            MakeCommentsToWallPost(message.tenant,message.company,message.from,message.reply_session,message.body,ack)
        });
    });
});

function MakeCommentsToWallPost(tenant,company,connectorId,objectid,msg,ack) {


    SocialConnector.findOne({'_id': JSON.parse(connectorId).id, company: company, tenant: tenant}, function (err, user) {

        if (err) {
            logger.error("Fail To Find Social Connector.",err);
            ack.reject(true);
        }
        if (user) {
            var propertiesObject = {
                access_token: user.fb.access_token,
                message: msg
            };
            var options = {
                method: 'post',
                uri: config.Services.facebookUrl + objectid + '/comments',
                qs: propertiesObject,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            request(options, function (error, response, body) {
                if (error) {
                    logger.error("Fail To Make Comment.",err);
                    ack.acknowledge();
                }
                else {

                    if (response.statusCode == 200) {
                        ack.acknowledge();
                    }
                    else {
                        logger.error("Fail To Make Comment.",new Error("Fail To Make Comment"));
                        ack.acknowledge();
                    }
                }
            });
        }
        else {
            logger.error("Fail To Find Connector.",new Error("Fail To Find Connector"));
            ack.acknowledge();
        }
    });
}

module.exports.MakeCommentsToWallPost = MakeCommentsToWallPost;


