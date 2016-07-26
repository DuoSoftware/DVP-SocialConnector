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



var queueHost = format('amqp://{0}:{1}@{2}:{3}',config.RabbitMQ.user,config.RabbitMQ.password,config.RabbitMQ.ip,config.RabbitMQ.port);
var queueName = config.Host.smsQueueName;




var queueConnection = amqp.createConnection({
    url: queueHost
});

queueConnection.on('ready', function () {
    queueConnection.queue(queueName, function (q) {
        q.bind('#');
        q.subscribe({
            ack: true,
            prefetchCount: 10
        }, function (message, headers, deliveryInfo, ack) {

            message = JSON.parse(message.data.toString());

            if (!message || !message.to || !message.from || !message.body || !message.company || !message.tenant) {
                console.log('Invalid message, skipping');
                return ack.reject();
            }
            ///////////////////////////create body/////////////////////////////////////////////////


            SendSMS(message,  deliveryInfo.deliveryTag.toString('hex'), ack);
        });
    });
});

var mainServer = format("http://{0}", config.LBServer.ip);

if(validator.isIP(config.LBServer.ip))
    mainServer = format("http://{0}:{1}", config.LBServer.ip, config.LBServer.port);

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

                        CreateEngagement('sms', company, tenant, mailoptions.from, mailoptions.to, 'outbound', sessionid, mailoptions.text, function (done, result) {
                            if (done) {
                                logger.debug("engagement created successfully");
                                if(mailoptions.reply_session){

                                    CreateComment('sms','text',company, tenant, mailoptions.reply_session, result, function (done) {
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


                                    if(mailoptions.ticket){

                                        var ticket_type = 'action';
                                        var ticket_priority = 'low';
                                        var ticket_tags = [];

                                       if( mailoptions.ticket_type)
                                       {
                                           ticket_type = mailoptions.ticket_type;
                                       }

                                        if( mailoptions.ticket_priority)
                                        {
                                            ticket_priority = mailoptions.ticket_priority;
                                        }

                                        if( mailoptions.ticket_tags)
                                        {
                                            ticket_tags = mailoptions.ticket_tags;
                                        }

                                        CreateTicket("sms", sessionid, result.profile, company, tenant, ticket_type , mailoptions.text, mailoptions.text, ticket_priority, ticket_tags, function (done) {
                                            if (done) {
                                                logger.info("Create Ticket Completed ");
                                            } else {
                                                logger.error("Create Ticket Failed ");
                                            }
                                            return cb(true);
                                        });
                                    }else{

                                        logger.info("Send SMS Completed ");
                                        return cb(true);
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


                                        mailOptions.text = renderedTemplate;

                                        SendRequest(company,tenant,mailOptions,function(done){

                                            if(!done)
                                                ack.reject(true);
                                            else
                                                ack.acknowledge();

                                        });
                                    }
                                }
                            }
                            else
                            {
                                console.log("Rendering Done");
                                mailOptions.text = outRendered;
                                SendRequest(company,tenant,mailOptions,function(done){

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

        SendRequest(company,tenant,mailOptions,function(done){

            if(!done)
                ack.reject(true);
            else
                ack.acknowledge();



        });

    }

};
////http://159.203.109.43:1401/send?username=foo&password=bar&to=336222172&content=Hello&dlr-url=http%3A%2F%2F45.55.171.228%3A9998%2Freply&dlr-level=2

module.exports.SendSMS = SendSMS;