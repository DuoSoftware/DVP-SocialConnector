var amqp = require('amqp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var request = require('request');
var format = require("stringformat");
var CreateEngagement = require('../Workers/common').CreateEngagement;
var CreateComment = require('../Workers/common').CreateComment;
var CreateTicket = require('../Workers/common').CreateTicket;
var GetCallRule = require('../Workers/common').GetCallRule;
var UpdateComment = require('../Workers/common').UpdateComment;
var config = require('config');
var validator = require('validator');
var dust = require('dustjs-linkedin');
var juice = require('juice');
var Template = require('../Model/Template').Template;
var uuid = require('node-uuid');



var queueHost = format('amqp://{0}:{1}@{2}:{3}?heartbeat=30',config.RabbitMQ.user,config.RabbitMQ.password,config.RabbitMQ.ip,config.RabbitMQ.port);
var queueName = config.Host.smsQueueName;


var smsmode = config.Host.smsmode;
var smpp;
if(smsmode == 'smpp'){

    smpp = require('../Workers/smpp');
}


var queueConnection = amqp.createConnection({
    url: queueHost
}, {
    reconnect: true,
    reconnectBackoffStrategy: 'linear',
    reconnectExponentialLimit: 120000,
    reconnectBackoffTime: 1000
});

queueConnection.on('ready', function () {
    queueConnection.queue(queueName, {durable: true, autoDelete: false},function (q) {
        q.bind('#');
        q.subscribe({
            ack: true,
            prefetchCount: 5
        }, function (message, headers, deliveryInfo, ack) {

            /*message = JSON.parse(message.data.toString());*/
            //logger.info(message);
            if (!message || !message.to || !message.company || !message.tenant) {
                logger.error('SMS - Invalid message, skipping');
                return ack.acknowledge();
            }
            //!message.from ||



            GetCallRule(message.company , message.tenant, message.from, message.to, "SMS", function(isDone, result){
                if(isDone){

                    if(result && result.TrunkNumber){

                        message.from =  result.TrunkNumber;
                        SendSMS(message,  deliveryInfo.deliveryTag.toString('hex'), ack);

                    }else{

                        message.from = "0710400400";
                        SendSMS(message,  deliveryInfo.deliveryTag.toString('hex'), ack);
                    }

                }else{
                    message.from = "0710400400";
                    SendSMS(message,  deliveryInfo.deliveryTag.toString('hex'), ack);
                }
            });
            ///////////////////////////create body/////////////////////////////////////////////////

        });
    });
});


connection.on('error', function (error) {
    logger.error('AMQP connection error' ,error);

});

connection.on('close', function () {
    console.log('AMQP Connection close ');

});

var mainServer = format("http://{0}", config.LBServer.ip);

if(validator.isIP(config.LBServer.ip))
    mainServer = format("http://{0}:{1}", config.LBServer.ip, config.LBServer.port);


function SendSMPP(company, tenant, mailoptions, cb){

    smpp.SendSMPP(mailoptions.from, mailoptions.to, mailoptions.text, function (_isDone, id) {

            try {

                if (_isDone) {

                    logger.debug("Successfully send sms");

                    CreateEngagement('sms', company, tenant, mailoptions.from, mailoptions.to, 'outbound', id, mailoptions.text, undefined, undefined, undefined, function (done, result) {
                        if (done) {
                            logger.debug("engagement created successfully");
                            if (mailoptions.reply_session) {

                                CreateComment('sms', 'text', company, tenant, mailoptions.reply_session, mailoptions.author, result, function (done) {
                                    if (!done) {
                                        logger.error("comment creation failed");
                                        return cb(true);
                                    } else {
                                        logger.debug("comment created successfully");
                                        return cb(true);
                                    }
                                });
                            }
                            else {


                                if (mailoptions.ticket) {

                                    var ticket_type = 'action';
                                    var ticket_priority = 'low';
                                    var ticket_tags = [];

                                    if (mailoptions.ticket_type) {
                                        ticket_type = mailoptions.ticket_type;
                                    }

                                    if (mailoptions.ticket_priority) {
                                        ticket_priority = mailoptions.ticket_priority;
                                    }

                                    if (mailoptions.ticket_tags) {
                                        ticket_tags = mailoptions.ticket_tags;
                                    }

                                    CreateTicket("sms", sessionid, result.profile_id, company, tenant, ticket_type, mailoptions.text, mailoptions.text, ticket_priority, ticket_tags, function (done) {
                                        if (done) {
                                            logger.info("Create Ticket Completed ");
                                        } else {
                                            logger.error("Create Ticket Failed ");
                                        }
                                        return cb(true);
                                    });
                                } else {

                                    if (mailoptions.comment) {

                                        UpdateComment(mailoptions.comment, id, function (done) {
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
                        } else {
                            logger.error("engagement creation failed");
                            return cb(false);
                        }
                    });

                } else {

                    logger.error("Send SMS Failed ");
                    return cb(false);
                }
            }
            catch (excep) {

                logger.error("Send SMS Failed "+excep);
                return cb(false);
            }

        });


};

function SendRequest(company, tenant, mailoptions, cb){


    if (config.SMSServer && config.SMSServer.ip && config.SMSServer.port && config.SMSServer.user && config.SMSServer.password) {

        var url = format("http://{0}:{1}/send?username={2}&password={3}&to={4}&from={5}&content={6}&dlr-url={7}/reply&dlr-level=2", config.SMSServer.ip, config.SMSServer.port, config.SMSServer.user, config.SMSServer.password,mailoptions.to, mailoptions.from, mailoptions.text,mainServer);


//http://159.203.109.43:1401/send?username=foo&password=bar&to=336222172&content=Hello&dlr-url=http%3A%2F%2F45.55.171.228%3A9998%2Freply&dlr-level=2
        request({
            method: "GET",
            url: url
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                    logger.debug("Successfully send sms");
                    var arr = _response.body.split(' ');
                    if(arr && arr.length > 1 && arr[0]=='Success') {

                        var sessionid=   arr[1].replace(/['"]+/g, '');

                        CreateEngagement('sms', company, tenant, mailoptions.from, mailoptions.to, 'outbound', sessionid, mailoptions.text,undefined,undefined,undefined, function (done, result) {
                            if (done) {
                                logger.debug("engagement created successfully");
                                if(mailoptions.reply_session){

                                    CreateComment('sms','text',company, tenant, mailoptions.reply_session, mailoptions.author,result, function (done) {
                                        if (!done) {
                                            logger.error("comment creation failed");
                                            return cb(true);
                                        }else{
                                            logger.debug("comment created successfully");
                                            return cb(true);
                                        }
                                    });
                                }
                                else {


                                    if (mailoptions.ticket) {

                                        var ticket_type = 'action';
                                        var ticket_priority = 'low';
                                        var ticket_tags = [];

                                        if (mailoptions.ticket_type) {
                                            ticket_type = mailoptions.ticket_type;
                                        }

                                        if (mailoptions.ticket_priority) {
                                            ticket_priority = mailoptions.ticket_priority;
                                        }

                                        if (mailoptions.ticket_tags) {
                                            ticket_tags = mailoptions.ticket_tags;
                                        }

                                        CreateTicket("sms", sessionid, result.profile_id, company, tenant, ticket_type, mailoptions.text, mailoptions.text, ticket_priority, ticket_tags, function (done) {
                                            if (done) {
                                                logger.info("Create Ticket Completed ");
                                            } else {
                                                logger.error("Create Ticket Failed ");
                                            }
                                            return cb(true);
                                        });
                                    } else {

                                        if (mailoptions.comment) {

                                            UpdateComment(mailoptions.comment, sessionid, function (done) {
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
                            } else {
                                logger.error("engagement creation failed");
                                return cb(false);
                            }
                        });
                    }else{

                        return cb(false);

                    }


                } else {

                    logger.error("Send SMS Failed "+_error);
                    return cb(false);

                }
            }
            catch (excep) {

                logger.error("Send SMS Failed "+excep);
                return cb(false);
            }

        });

    }

};

function SendSMS(message, deliveryInfo, ack) {


    logger.debug("DVP-SocialConnector.SendSMS Internal method ");
    var jsonString;
    var tenant = message.tenant;
    var company = message.company;



    var mailOptions = {
        from: message.from,
        to: message.to,
        text: message.body,
        ticket: message.ticket,
        comment: message.comment,
        author: message.author,
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
                            ack.acknowledge();
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
                                        mailOptions.text = renderedTemplate;

                                        if(smpp){

                                            SendSMPP(company, tenant, mailOptions, function (done) {

                                                if (!done)
                                                    ack.acknowledge();
                                                        //.reject(true);
                                                else
                                                    ack.acknowledge();

                                            });
                                        }else {
                                            SendRequest(company, tenant, mailOptions, function (done) {

                                                if (!done)
                                                    //ack.reject(true);
                                                    ack.acknowledge();
                                                else
                                                    ack.acknowledge();

                                            });
                                        }
                                    }
                                }
                            }
                            else
                            {
                                console.log("Rendering Done");
                                mailOptions.text = outRendered;
                                if(smpp){
                                    SendSMPP(company, tenant, mailOptions, function (done) {

                                        if (!done)
                                            //ack.reject(true);
                                            ack.acknowledge();
                                        else
                                            ack.acknowledge();

                                    });

                                }else {
                                    SendRequest(company, tenant, mailOptions, function (done) {

                                        if (!done)
                                            //ack.reject(true);
                                            ack.acknowledge();
                                        else
                                            ack.acknowledge();

                                    });
                                }
                            }
                        }
                    });

                }else{

                    logger.error("No template found");
                    //ack.reject(true);
                    ack.acknowledge();

                }

            }else{


                logger.error("Pick template failed ",errPickTemplate);
                //ack.reject(true);
                ack.acknowledge();

            }

        });

    }else{

        if(smpp) {
            SendSMPP(company, tenant, mailOptions, function (done) {

                if (!done)
                    //ack.reject(true);
                    ack.acknowledge();
                else
                    ack.acknowledge();


            });
        }else{
            SendRequest(company, tenant, mailOptions, function (done) {

                if (!done)
                    //ack.reject(true);
                    ack.acknowledge();
                else
                    ack.acknowledge();


            });


        }

    }

};
////http://159.203.109.43:1401/send?username=foo&password=bar&to=336222172&content=Hello&dlr-url=http%3A%2F%2F45.55.171.228%3A9998%2Freply&dlr-level=2

module.exports.SendSMS = SendSMS;
