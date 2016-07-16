var mongoose = require('mongoose');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var Twitter = require('dvp-mongomodels/model/Twitter').Twitter;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var TwitterClient = require('twitter');
var config = require('config');
var request = require("request");
var format = require("stringformat");
var validator = require('validator');
var util = require('util');

var token  = config.Services.accessToken;

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var _twitterConsumerKey = "dUTFwOCHWXpvuLSsgQ7zvOPRK";
var _twitterConsumerSecret = "KXDD9YRt58VddSTuYzvoGGGsNK5B5p9ElJ31WNLcZZkR4eVzp9";


var serverID = config.Host.ServerID;
var serverType = config.Host.ServerType;

//http://localhost:3636/DVP/API/1.0.0.0/TicketByEngagement/754236638146859008/Comment

function CreateTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.CreateTwitterAccount Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);


    var twitter = Twitter({

        _id: req.body.id,
        company: company,
        tenant: tenant,
        name: req.body.name,
        screen_name: req.body.name,
        access_token_key: req.body.access_token_key,
        access_token_secret: req.body.access_token_secret,
        created_at: Date.now(),
        updated_at: Date.now()

    });

    twitter.save(function (err, engage) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Twitter save failed", false, undefined);
            res.end(jsonString);
        } else {


            RegisterCronJob(company,tenant,10,req.body.id,function(isSuccess){

                if(isSuccess) {
                    jsonString = messageFormatter.FormatMessage(undefined, "Twitter and cron saved successfully", true, engage);
                }
                else
                {
                    jsonString = messageFormatter.FormatMessage(undefined, "Twitter saved but cron failed", false, engage);

                }
                res.end(jsonString);

            })

        }
    });


};

function DeleteTwitterAccount(req,res){


    logger.debug("DVP-SocialConnector.DeleteTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    Twitter.findOneAndRemove({_id: req.params.id,company: company, tenant: tenant}, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Delete Twitter account failed", false, undefined);
        }else{
            jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter account Success", true, twitter);
        }
        res.end(jsonString);
    });

};

function LoadTwitterMessages(req, res) {


    logger.debug("DVP-SocialConnector.LoadTwitterMessages Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function(err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        }else {

            if (twitter) {


                jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });


                var params = {screen_name: 'nodejs', trim_user: true};

                if(twitter.direct_messages_since > 0)
                    params = {screen_name: 'nodejs', trim_user: true, since_id: twitter.direct_messages_since, count: 200};

                client.get('direct_messages', params, function(error, tweets, response){
                    if (!error) {
                        //console.log(tweets);
                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets found", true, undefined);


                        if(util.isArray(tweets) && tweets.length >0) {

                            var since_id = tweets[0].id_str;

                            twitter.direct_messages_since = since_id;

                            Twitter.findOneAndUpdate({company: company, tenant: tenant, _id: req.params.id}, {$set:{direct_messages_since:since_id}}, function(err, doc){
                                if(err){

                                    logger.error("Update since id failed"+ err);

                                }else{


                                    logger.debug("Update since id successfully");
                                    //////////////////////////////////////////////////////////////////////////////////////////////////////
                                    tweets.forEach(function (item) {


                                        CreateEngagement("twitter", company, tenant, item.sender_screen_name, item.recipient_screen_name, "inbound", item.id_str, item.text, function (isSuccess, result) {

                                            if (isSuccess) {

                                                AddToRequest(company, tenant, item.id, 'L', '', ['66'], function (done) {

                                                    if (done) {


                                                        logger.error("Add Request completed ");


                                                    } else {

                                                        logger.error("Add Request failed " + item.id);
                                                    }

                                                });

                                            } else {

                                                logger.error("Create engagement failed " + item.id);
                                            }

                                        })

                                    });
                                }

                            });
                        }

                        res.end(jsonString);

                    }else{
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                        res.end(jsonString);
                    }
                });


            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

            }
        }


    });
};

function LoadTweets(req, res) {


    logger.debug("DVP-SocialConnector.LoadTweets Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function(err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        }else {

            if (twitter) {


                jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });


                var params = {screen_name: 'nodejs', trim_user: true};

                if(twitter.tweet_since > 0)
                    params = {screen_name: 'nodejs', since_id: twitter.tweet_since, count: 200};

                client.get('statuses/mentions_timeline', params, function(error, tweets, response){
                    if (!error) {
                        //console.log(tweets);
                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets found", true, undefined);


                        if(util.isArray(tweets) && tweets.length >0) {

                            var since_id = tweets[0].id_str;

                            twitter.tweet_since = since_id;

                            Twitter.findOneAndUpdate({
                                company: company,
                                tenant: tenant,
                                _id: req.params.id
                            }, {$set: {tweet_since: since_id}}, function (err, doc) {
                                if (err) {

                                    logger.error("Update since id failed" + err);

                                } else {


                                    logger.debug("Update since id successfully");

                                    //////////////////////////////////////////////////////////////////////////////////////////////////////

                                    tweets.forEach(function (item) {


                                        CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, function (isSuccess, result) {

                                            if (isSuccess) {


                                                //////////////////////////////////////fresh one we add to ards//////////////////////////////////////

                                                if(item.in_reply_to_status_id_str) {

                                                    CreateComment(company, tenant,item.in_reply_to_status_id_str, result, function (done) {

                                                        if (done) {

                                                            AddToRequest(company, tenant, item.id, 'L', '', ['66'], function (done) {

                                                                if (done) {


                                                                    logger.error("Add Request completed ");


                                                                    jsonString = messageFormatter.FormatMessage(undefined, "Add Request completed", true, undefined);
                                                                    res.end(jsonString);


                                                                } else {

                                                                    logger.error("Add Request failed " + item.id);

                                                                    jsonString = messageFormatter.FormatMessage(undefined, "Add Request completed", false, undefined);
                                                                    res.end(jsonString);
                                                                }

                                                            });


                                                        }else{


                                                            jsonString = messageFormatter.FormatMessage(undefined, "Add Request completed", false, undefined);
                                                            res.end(jsonString);
                                                        }


                                                    })

                                                }else {

                                                    AddToRequest(company, tenant, item.id, 'L', '', ['66'], function (done) {

                                                        if (done) {


                                                            logger.info("Add Request completed ");

                                                            jsonString = messageFormatter.FormatMessage(undefined, "Add Request completed", true, undefined);
                                                            res.end(jsonString);


                                                        } else {

                                                            logger.error("Add Request failed " + item.id);
                                                            jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                                                            res.end(jsonString);
                                                        }

                                                    });
                                                }

                                                //////////////////////////////////////first check in comments and update them////////////////////////////////////////////////////////////////

                                            } else {

                                                logger.error("Create engagement failed " + item.id);
                                                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                                                res.end(jsonString);
                                            }

                                        })

                                    });
                                }


                            });


                        }else{
                            jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                            res.end(jsonString);
                        }

                       // res.end(jsonString);

                    }else{
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                        res.end(jsonString);
                    }
                });


            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

            }
        }


    });
};

function ReplyTweet(req, res){

    logger.debug("DVP-SocialConnector.LoadTweets Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function(err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        }else {

            if (twitter) {


                jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });


                var params = {status: "@"+req.body.to+" "+req.body.message,in_reply_to_status_id:req.params.tid};





                client.post('statuses/update', params, function(error, tweets, response){
                    if (!error) {
                        //console.log(tweets);


                        CreateEngagement("twitter", company, tenant, tweets.user.screen_name, tweets.in_reply_to_screen_name, "outbound", tweets.id_str, req.body.message, function (isSuccess, result) {

                            if (isSuccess) {

                                jsonString = messageFormatter.FormatMessage(undefined, "Tweets successfully replied", true, result);



                            } else {

                                logger.error("Tweet reply failed ");
                            }


                            res.end(jsonString);
                        })



                    }else{
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, response);
                        res.end(jsonString);
                    }
                });


            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

            }
        }


    });


}

function AddToRequest(company, tenant,session_id, priority, otherInfo, attributes, cb){


    if (config.Services && config.Services.ardsServiceHost && config.Services.ardsServicePort && config.Services.ardsServiceVersion) {

        var url = format("http://{0}/DVP/API/{1}/ARDS/request", config.Services.ardsServiceHost, config.Services.ardsServiceVersion);
        if (validator.isIP(config.Services.ardsServiceHost))
            url = format("http://{0}:{1}/DVP/API/{2}/ARDS/request", config.Services.ardsServiceHost, config.Services.ardsServicePort, config.Services.ardsServiceVersion);


        var data = {

            SessionId: session_id,
            RequestType: "SOCIAL",
            Priority: priority,
            ResourceCount: 1,
            OtherInfo: otherInfo,
            Attributes: attributes,
            RequestServerId: serverID,
            ServerType: serverType

        };


        request({
            method: "POST",
            url: url,
            headers: {
                authorization: "Bearer " + config.Services.accessToken,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: data
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                    logger.debug("Successfully registered");
                    cb(true);
                } else {

                    logger.error("Registration Failed "+_error);
                    cb(false);

                }
            }
            catch (excep) {

                logger.error("Registration Failed "+excep);
                cb(false);
            }

        });

    }

};

function CreateComment(company, tenant, engid, engagement, cb){

    //http://localhost:3636/DVP/API/1.0.0.0/TicketByEngagement/754236638146859008/Comment

    if (config.Services && config.Services.ticketServiceHost && config.Services.ticketServicePort && config.Services.ticketServiceVersion) {

        var url = format("http://{0}/DVP/API/{1}/TicketByEngagement/{2}/Comment", config.Services.ticketServiceHost, config.Services.ticketServiceVersion,engagement._id);
        if (validator.isIP(config.Services.ticketServiceHost))
            url = format("http://{0}:{1}/DVP/API/{2}/TicketByEngagement/{3}/Comment", config.Services.ticketServiceHost, config.Services.ticketServicePort,config.Services.ticketServiceVersion, engid);




        var data = {

            body: engagement.body,
            body_type: "text",
            type: "twitter mesage",
            public: true,
            channel: "twitter",
            channel_from: engagement.channel_from,
            engagement_session: engagement.engagement_id,
            author_external: engagement.profile_id


        };


        request({
            method: "POST",
            url: url,
            headers: {
                authorization: "Bearer " + config.Services.accessToken,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: data
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200) {

                    logger.debug("Successfully registered");
                    cb(true);
                } else {

                    logger.error("Registration Failed "+_error);
                    cb(false);

                }
            }
            catch (excep) {

                logger.error("Registration Failed "+excep);
                cb(false);
            }

        });

    }

};

function CreateEngagement(channel, company, tenant, from, to, direction, session, data,cb){

    if((config.Services && config.Services.interactionurl && config.Services.interactionport && config.Services.interactionversion)) {


        var engagementURL = format("http://{0}/DVP/API/{1}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionversion);
        if (validator.isIP(config.Services.interactionurl))
            engagementURL = format("http://{0}:{1}/DVP/API/{2}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionport, config.Services.interactionversion);

        var engagementData =  {
            engagement_id: session,
            channel: channel,
            direction: direction,
            channel_from:from,
            channel_to: to,
            body: data
        };

        logger.debug("Calling Engagement service URL %s", engagementURL);
        request({
            method: "POST",
            url: engagementURL,
            headers: {
                authorization: "bearer "+token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    cb(true,_response.body.Result);

                }else{

                    logger.error("There is an error in  create engagements for this session "+ session);
                    cb(false,{});


                }
            }
            catch (excep) {

                cb(false,{});

            }
        });
    }
};

function RegisterCronJob(company, tenant, time, id, cb){

    if((config.Services && config.Services.cronurl && config.Services.cronport && config.Services.cronversion)) {


        var cronURL = format("http://{0}/DVP/API/{1}/Cron", config.Services.cronurl, config.Services.cronversion);
        if (validator.isIP(config.Services.cronurl))
            cronURL = format("http://{0}:{1}/DVP/API/{2}/Cron", config.Services.cronurl, config.Services.cronport, config.Services.cronversion);


        var mainServer = format("http://{0}/DVP/API/{1}/Social/Twitter/{2}/directmessages", config.LBServer.ip, config.Host.version,id);

        if (validator.isIP(config.LBServer.ip))
            mainServer = format("http://{0}:{1}/DVP/API/{2}/Social/Twitter/{3}/directmessages", config.LBServer.ip, config.LBServer.port, config.Host.version,id);



        var engagementData =  {

            Reference: id,
            Description: "Direct message twitter",
            CronePattern: format( "*/{0} * * * * *",time),
            CallbackURL: mainServer,
            CallbackData: ""

        };

        logger.debug("Calling cron registration service URL %s", cronURL);
        request({
            method: "POST",
            url: cronURL,
            headers: {
                authorization: "bearer "+token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    cb(true,_response.body.Result);

                }else{

                    logger.error("There is an error in  cron registration for this");
                    cb(false,{});


                }
            }
            catch (excep) {

                cb(false,{});

            }
        });
    }

};

module.exports.CreateTwitterAccount = CreateTwitterAccount;
module.exports.LoadTwitterMessages = LoadTwitterMessages;
module.exports.LoadTweets = LoadTweets;
module.exports.AddToRequest = AddToRequest;
module.exports.CreateEngagement = CreateEngagement;
module.exports.ReplyTweet = ReplyTweet;
module.exports.CreateComment = CreateComment;
module.exports.DeleteTwitterAccount = DeleteTwitterAccount;