/**
 * Created by a on 7/22/2016.
 */

var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var request = require('request');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var format = require("stringformat");
var Template = require('../Model/Template').Template;
var uuid = require('node-uuid');
var CreateEngagement = require('../Workers/common').CreateEngagement;
var CreateComment = require('../Workers/common').CreateComment;
var dust = require('dustjs-linkedin');
var juice = require('juice');
var config = require('config');
var validator = require('validator');


var mainServer = format("http://{0}", config.LBServer.ip);

if(validator.isIP(config.LBServer.ip))
    mainServer = format("http://{0}:{1}", config.LBServer.ip, config.LBServer.port);

function SendRequest(company, tenant, mailoptions, cb){

    if (config.SMSServer && config.SMSServer.ip && config.SMSServer.port && config.SMSServer.user && config.SMSServer.password) {
        var url = format("http://{0}:{1}/send?username={2}&password={3}&to={4}&from={5}&content={6}&dlr-url={7}/reply&dlr-level=2", config.SMSServer.ip, config.SMSServer.port, config.SMSServer.user, config.SMSServer.password,mailoptions.to, mailoptions.from, mailoptions.text,mainServer);
        request({
            method: "GET",
            url: url
        }, function (_error, _response, datax) {
            try {
                if (!_error && _response && _response.statusCode == 200) {
                    logger.debug("Successfully registered");
                    var arr = _response.body.split(' ');
                    if(arr && arr.length > 1 && arr[0]=='Success') {
                     var sessionid=   arr[1].replace(/['"]+/g, '');

                        CreateEngagement('sms', company, tenant, mailoptions.from, mailoptions.to, 'outbound', sessionid, mailoptions.text,undefined,undefined,undefined, function (done) {
                            if (done) {
                                logger.debug("engagement created successfully");
                                if(mailoptions.reply_session){

                                    CreateComment('sms','text',company, tenant, mailoptions.reply_session, undefined,result, function (done) {
                                        if (!done) {
                                            logger.debug("comment created successfully");
                                            return cb(true);
                                        }else{
                                            logger.error("comment creation failed");
                                            return cb(true);
                                        }
                                    });
                                }
                                else {
                                    return cb(true);
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

                    logger.error("Registration Failed "+_error);
                    return cb(false);
                }
            }
            catch (excep) {
                logger.error("Registration Failed "+excep);
                return cb(false);
            }

        });
    }
};

function SendSMS(req, res) {


    logger.debug("DVP-SocialConnector.SendSMS Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    var onj = req.body;

    var mailOptions = {
        from: req.body.from,
        to: req.body.to,
        text: req.body.message,
        reply_session: req.body.reply_session
    };

    SendRequest(company, tenant, mailOptions, function (done) {
        if (!done)
            jsonString = messageFormatter.FormatMessage(undefined, "Send sms failed", false, undefined);
        else
            jsonString = messageFormatter.FormatMessage(undefined, "Send sms successful", true, undefined);
        res.end(jsonString);
    });
};
////http://159.203.109.43:1401/send?username=foo&password=bar&to=336222172&content=Hello&dlr-url=http%3A%2F%2F45.55.171.228%3A9998%2Freply&dlr-level=2

module.exports.SendSMS = SendSMS;