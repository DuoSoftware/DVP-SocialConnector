var amqp = require('amqp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var request = require('request');
var format = require("stringformat");
var CreateEngagement = require('../Workers/common').CreateEngagement;
var CreateComment = require('../Workers/common').CreateComment;
var CreateTicket = require('../Workers/common').CreateTicket;
var UpdateComment = require('../Workers/common').UpdateComment;
var config = require('config');
var validator = require('validator');
var dust = require('dustjs-linkedin');
var juice = require('juice');
var Template = require('../Model/Template').Template;
var uuid = require('node-uuid');
var TwitterClient = require('twitter');
var Twitter = require('dvp-mongomodels/model/Twitter').Twitter;


var queueHost = format('amqp://{0}:{1}@{2}:{3}',config.RabbitMQ.user,config.RabbitMQ.password,config.RabbitMQ.ip,config.RabbitMQ.port);
var queueName = config.Host.twitterQueueName;



var _twitterConsumerKey = "dUTFwOCHWXpvuLSsgQ7zvOPRK";
var _twitterConsumerSecret = "KXDD9YRt58VddSTuYzvoGGGsNK5B5p9ElJ31WNLcZZkR4eVzp9";


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

            if (!message || !message.to || !message.from ||  !message.body || !message.company || !message.tenant) {
                console.log('Invalid message, skipping');
                return ack.acknowledge();
            }
            ///////////////////////////create body/////////////////////////////////////////////////


            SendTweet(message,  deliveryInfo.deliveryTag.toString('hex'), ack);
        });
    });
});

var mainServer = format("http://{0}", config.LBServer.ip);

if(validator.isIP(config.LBServer.ip))
    mainServer = format("http://{" +
        "0}:{1}", config.LBServer.ip, config.LBServer.port);

function SendRequest(company, tenant, twitteroptions, cb){

    logger.debug("DVP-SocialConnector.ReplyTweet Internal method ");



    var obj = {$and:[{company: company, tenant: tenant}, {$or: [{name: twitteroptions.from}, {screen_name: twitteroptions.from}]}]};

    Twitter.findOne(obj, function(err, twitter) {
        if (err) {

            logger.error("No Twitter found ", err);
            return cb(false);

        }else {
            if (twitter) {

                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {status: "@"+twitteroptions.to+" "+twitteroptions.text,in_reply_to_status_id:twitteroptions.reply_session};
                client.post('statuses/update', params, function(error, tweets, response){
                    if (!error) {
                        //console.log(tweets);

                        CreateEngagement("twitter", company, tenant, tweets.user.screen_name, tweets.in_reply_to_screen_name, "outbound", tweets.id_str, twitteroptions.text,undefined, undefined,undefined,function (isSuccess, result) {

                            if (isSuccess) {


                                if(twitteroptions.update_comment){

                                    UpdateComment(tenant, company, twitteroptions.comment,tweets.id_str, function (done) {
                                        if (done) {
                                            logger.info("Update Comment Completed ");

                                        } else {

                                            logger.error("Update Comment Failed ");

                                        }

                                        return cb(true);
                                    });

                                }else {

                                    if (twitteroptions.reply_session) {
                                        CreateComment('twitter', 'out_tweets', company, tenant, twitteroptions.reply_session, twitteroptions.author, result, function (done) {
                                            if (done) {

                                                logger.info("Tweet Reply Success with comment ");
                                                return cb(true);
                                            }
                                            else {

                                                logger.error("Comment Creation Failed ");
                                                return cb(false);
                                            }

                                        });
                                    } else {

                                        if (twitteroptions.ticket) {

                                            var ticket_type = 'action';
                                            var ticket_priority = 'low';
                                            var ticket_tags = [];

                                            if (twitteroptions.ticket_type) {
                                                ticket_type = twitteroptions.ticket_type;
                                            }

                                            if (twitteroptions.ticket_priority) {
                                                ticket_priority = twitteroptions.ticket_priority;
                                            }

                                            if (twitteroptions.ticket_tags) {
                                                ticket_tags = twitteroptions.ticket_tags;
                                            }


                                            CreateTicket("twitter", tweets.id_str, result.profile_id, company, tenant, ticket_type, twitteroptions.text, twitteroptions.text, ticket_priority, ticket_tags, function (done) {
                                                if (done) {
                                                    logger.info("Create Ticket Completed ");

                                                } else {

                                                    logger.error("Create Ticket Failed ");

                                                }

                                                return cb(true);
                                            });
                                        } else {

                                            if (twitteroptions.comment) {

                                                UpdateComment(tenant, company, twitteroptions.comment, tweets.id_str, function (done) {
                                                    if (done) {
                                                        logger.info("Update Comment Completed ");

                                                    } else {

                                                        logger.error("Update Comment Failed ");

                                                    }

                                                    return cb(true);
                                                });

                                            } else {
                                                return cb(true);
                                            }
                                        }
                                    }
                                }
                            } else {

                                logger.error("Tweet Reply Failed ");
                                return cb(false);

                            }
                        })

                    }else{

                        logger.error("Tweet Reply Error", error);
                        return cb(false);

                    }
                });
            }else{

                logger.error("No Tweet Found");
                return cb(false);

            }
        }
    });

};

function SendTweet(message, deliveryInfo, ack) {


    logger.debug("DVP-SocialConnector.SendTweet Internal method ");
    var jsonString;
    var tenant = message.tenant;
    var company = message.company;



    var tweetOptions = {
        from: message.from,
        to: message.to,
        text: message.body,
        ticket: message.ticket,
        comment: message.comment,
        author: message.author,
        update_comment: message.update_comment,
        reply_session: message.reply_session,
        ticket_type : message.ticket_type,
        ticket_priority : message.ticket_priority,
        ticket_tags : message.ticket_tags

    };


    if(message && message.template){
        Template.findOne({name:message.template,company:message.company,tenant:message.tenant},function (errPickTemplate,resPickTemp) {


            if(!errPickTemplate){

                if(resPickTemp){

                    var compileid = uuid.v4();

                    var compiled = dust.compile(resPickTemp.content.content, compileid);
                    dust.loadSource(compiled);
                    dust.render(compileid, message.Parameters, function(errRendered, outRendered) {
                        if(errRendered)
                        {
                            logger.error("Error in rendering "+ errRendered);
                        }
                        else
                        {

                            var renderedTemplate="";
                            var juiceOptions={
                                applyStyleTags  :true
                            }

                            if(resPickTemp.styles.length>0)
                            {
                                for(var i=0;i<resPickTemp.styles.length;i++)
                                {
                                    if (i == 0)
                                    {
                                        renderedTemplate = outRendered;
                                    }

                                    //console.log(resPickTemp.styles[i].content);
                                    logger.info("Rendering is success "+ resPickTemp.styles[i].content);

                                    renderedTemplate=juice.inlineContent(renderedTemplate, resPickTemp.styles[i].content, juiceOptions);
                                    if(i==(resPickTemp.styles.length-1))
                                    {


                                        tweetOptions.text = renderedTemplate;

                                        SendRequest(company,tenant,tweetOptions,function(done){

                                            ack.acknowledge();

                                        });
                                    }
                                }
                            }
                            else
                            {
                                console.log("Rendering Done");
                                tweetOptions.text = outRendered;
                                SendRequest(company,tenant,tweetOptions,function(done){

                                    if(!done)
                                        ack.reject(true);
                                    else
                                        ack.acknowledge();

                                });
                            }
                        }

                    });

                }else{

                    logger.error("No template found");
                    ack.reject(true);
                }

            }else{


                logger.error("Pick template failed ",errPickTemplate);
                ack.reject(true);

            }

        });

    }else{

        SendRequest(company,tenant,tweetOptions,function(done){
                ack.acknowledge();
        });

    }

};
////http://159.203.109.43:1401/send?username=foo&password=bar&to=336222172&content=Hello&dlr-url=http%3A%2F%2F45.55.171.228%3A9998%2Freply&dlr-level=2

module.exports.SendTweet = SendTweet;

