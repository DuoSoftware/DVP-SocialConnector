var mongoose = require('mongoose');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var Twitter = require('dvp-mongomodels/model/Twitter').Twitter;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var TwitterClient = require('twitter');
var config = require('config');
var AddToRequest = require('../Workers/common').AddToRequest;
var CreateComment = require('../Workers/common').CreateComment;
var CreateEngagement = require('../Workers/common').CreateEngagement;
var CreateTicket = require('../Workers/common').CreateTicket;
var RegisterCronJob = require('../Workers/common').RegisterCronJob;
var util = require('util');
var validator = require('validator');
var format = require("stringformat");

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
        ticket_type: req.body.ticket_type,
        ticket_tags: req.body.ticket_tags,
        ticket_priority: req.body.ticket_priority,
        created_at: Date.now(),
        updated_at: Date.now(),
        status :true
    });

    twitter.save(function (err, engage) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Twitter save failed", false, undefined);
            res.end(jsonString);
        } else {

            var mainServer = format("http://{0}/DVP/API/{1}/Social/Twitter/{2}/directmessages", config.LBServer.ip, config.Host.version,engage._id);

            if (validator.isIP(config.LBServer.ip))
                mainServer = format("http://{0}:{1}/DVP/API/{2}/Social/Twitter/{3}/directmessages", config.LBServer.ip, config.LBServer.port, config.Host.version,engage._id);


            RegisterCronJob(company,tenant,10,req.body.id,mainServer,function(isSuccess){

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
}

function DeleteTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.DeleteTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    var twitter = Twitter({
        status :false,
        updated_at: Date.now()
    });

    Twitter.findOneAndUpdate({_id: req.params.id,company: company, tenant: tenant},twitter, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Delete Twitter account failed", false, undefined);
        }else{
            jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter account Success", true, twitter);
        }
        res.end(jsonString);
    });
}

function ActivateTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.ActivateTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    var twitter = Twitter({
        status :true,
        updated_at: Date.now()
    });

    Twitter.findOneAndUpdate({_id: req.params.id,company: company, tenant: tenant},twitter, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Activate Twitter account failed", false, undefined);
        }else{
            jsonString = messageFormatter.FormatMessage(undefined, "Activate Twitter account Success", true, twitter);
        }
        res.end(jsonString);
    });
}

function StreamTwitterMessages(req, res) {


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


                if (twitter) {
                    jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);
                    var ticket_type = 'question';
                    var ticket_tags = [];
                    var ticket_priority = 'low';

                    if (twitter.ticket_type) {
                        ticket_type = ticket_type;
                    }

                    if (twitter.ticket_tags) {
                        ticket_tags = ticket_tags;
                    }

                    if (twitter.ticket_priority) {
                        ticket_priority = ticket_priority;
                    }

                    var client = new TwitterClient({
                        consumer_key: _twitterConsumerKey,
                        consumer_secret: _twitterConsumerSecret,
                        access_token_key: twitter.access_token_key,
                        access_token_secret: twitter.access_token_secret
                    });
                    //var params = {screen_name: 'nodejs', trim_user: true};


                    client.stream('user', {}, function (stream) {
                        stream.on('data', function (item) {
                            console.log(item && item.text);


                            if (item.in_reply_to_screen_name && item.id_str) {

                                var since_id = item.id_str;
                                twitter.tweet_since = since_id;
                                Twitter.findOneAndUpdate({
                                    company: company,
                                    tenant: tenant,
                                    _id: req.params.id
                                }, {$set: {tweet_since: since_id}}, function (err, doc) {
                                    if (err) {
                                        logger.error("Update since id failed" + err);

                                    } else {


                                        var user = {};
                                        user.name = item.user.name;
                                        user.avatar = item.user.profile_image_url;
                                        user.channel = 'twitter';
                                        user.id = item.user.id_str;



                                        CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, user, function (isSuccess, result) {
                                            if (isSuccess) {
                                                //////////////////////////////////////fresh one we add to ards//////////////////////////////////////
                                                if (item.in_reply_to_status_id_str) {
                                                    CreateComment('twitter', 'tweets', company, tenant, item.in_reply_to_status_id_str, undefined, result, function (done) {
                                                        if (!done) {

                                                            CreateTicket("twitter", item.id_str, result.profile_id, company, tenant, ticket_type, item.text, item.text, ticket_priority, ticket_tags, function (done) {
                                                                if (done) {
                                                                    logger.info("Twitter Ticket Added successfully " + item.id_str);

                                                                } else {

                                                                    logger.error("Create Ticket failed " + item.id);

                                                                }
                                                            });
                                                        } else {

                                                            logger.info("Twitter Comment Added successfully " + item.id_str);
                                                        }
                                                    })
                                                } else {
                                                    /////////////////////////////////////////////create ticket directly//////////////////////////
                                                    //CreateTicket("sms",sessionid,sessiondata["CompanyId"],sessiondata["TenantId"],smsData["type"], smsData["subject"], smsData["description"],smsData["priority"],smsData["tags"],function(success, result){});

                                                    CreateTicket("twitter", item.id_str, result.profile_id, company, tenant, ticket_type, item.text, item.text, ticket_priority, ticket_tags, function (done) {
                                                        if (done) {

                                                            logger.info("Twitter Ticket Added successfully " + item.id_str);

                                                        } else {

                                                            logger.error("Add Request failed " + item.id);
                                                        }
                                                    });
                                                }
                                                //////////////////////////////////////first check in comments and update them////////////////////////////////////////////////////////////////

                                            } else {

                                                logger.error("Create engagement failed " + item.id);
                                            }
                                        })
                                    }
                                });
                            } else {
                                console.log("no enough data");
                            }

                        });

                        stream.on('error', function (error) {
                            throw error;
                        });
                    });

                } else {

                    jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                    res.end(jsonString);

                }

                jsonString = messageFormatter.FormatMessage(undefined, "Twitter Stream started", true, undefined);
                res.end(jsonString);

            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

            }
        }

    });
};



function UpdateTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.UpdateTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;



    var twitter = Twitter({


        ticket_type: req.body.ticket_type,
        ticket_tags: req.body.ticket_tags,
        ticket_priority: req.body.ticket_priority,
        updated_at: Date.now()

    });

    Twitter.findOneAndUpdate({_id: req.params.id,company: company, tenant: tenant},twitter, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Update Twitter account failed", false, undefined);
        }else{
            jsonString = messageFormatter.FormatMessage(undefined, "Update Twitter account Success", true, twitter);
        }
        res.end(jsonString);
    });


};

/*function DeleteTwitterAccount(req,res){


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

};*/

function GetTwitterAccount(req,res){


    logger.debug("DVP-SocialConnector.GetTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    Twitter.findOne({_id: req.params.id,company: company, tenant: tenant}, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter account failed", false, undefined);
        }else{
            if(twitter) {
                jsonString = messageFormatter.FormatMessage(undefined, "Get Twitter account Success", true, twitter);
            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
            }
        }
        res.end(jsonString);
    });

};

function GetTwitterAccounts(req,res){


    logger.debug("DVP-SocialConnector.GetTwitterAccounts Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    Twitter.find({company: company, tenant: tenant}, function(err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter accounts failed", false, undefined);
        }else{
            if(twitter && twitter.length > 0) {
                jsonString = messageFormatter.FormatMessage(undefined, "Get Twitter accounts Success", true, twitter);
            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
            }
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


                                        CreateEngagement("twitter", company, tenant, item.sender_screen_name, item.recipient_screen_name, "inbound", item.id_str, item.text,undefined, function (isSuccess, result) {

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
                var ticket_type = 'question';
                var ticket_tags = [];
                var ticket_priority = 'low';

                if(twitter.ticket_type){
                    ticket_type = ticket_type;
                }

                if(twitter.ticket_tags){
                    ticket_tags = ticket_tags;
                }

                if(twitter.ticket_priority){
                    ticket_priority = ticket_priority;
                }

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
                                    jsonString = messageFormatter.FormatMessage(undefined, "Update Since Id Failed", true, err);
                                    res.end(jsonString);
                                } else {
                                    logger.debug("Update since id successfully");
                                    jsonString = messageFormatter.FormatMessage(undefined, "Twitter process done ", true, undefined);
                                    res.end(jsonString);
                                    //////////////////////////////////////////////////////////////////////////////////////////////////////
                                    tweets.forEach(function (item) {
                                        CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined, function (isSuccess, result) {
                                            if (isSuccess) {
                                                //////////////////////////////////////fresh one we add to ards//////////////////////////////////////
                                                //////////////////////////////////////fresh one we add to ards//////////////////////////////////////
                                                if(item.in_reply_to_status_id_str) {
                                                    CreateComment('twitter','tweets',company, tenant,item.in_reply_to_status_id_str, undefined,result, function (done) {
                                                        if (!done) {

                                                            CreateTicket("twitter", item.id_str, result.profile_id, company, tenant,  ticket_type, item.text,item.text, ticket_priority,ticket_tags, function (done) {
                                                                if (done) {
                                                                    logger.info("Twitter Ticket Added successfully " + item.id_str);

                                                                } else {

                                                                    logger.error("Create Ticket failed " + item.id);

                                                                }
                                                            });
                                                        }else{

                                                            logger.info("Twitter Comment Added successfully " + item.id_str);
                                                        }
                                                    })
                                                }else {
                                                    /////////////////////////////////////////////create ticket directly//////////////////////////
                                                    //CreateTicket("sms",sessionid,sessiondata["CompanyId"],sessiondata["TenantId"],smsData["type"], smsData["subject"], smsData["description"],smsData["priority"],smsData["tags"],function(success, result){});

                                                    CreateTicket("twitter", item.id_str,result.profile_id,company, tenant, ticket_type, item.text,item.text, ticket_priority,ticket_tags, function (done) {
                                                        if (done) {


                                                            logger.info("Twitter Ticket Added successfully " + item.id_str);


                                                        } else {

                                                            logger.error("Add Request failed " + item.id);

                                                        }
                                                    });
                                                }
                                                //////////////////////////////////////first check in comments and update them////////////////////////////////////////////////////////////////

                                            } else {

                                                logger.error("Create engagement failed " + item.id);

                                            }
                                        })
                                    });
                                }
                            });
                        }else{
                            jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                            res.end(jsonString);
                        }
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

    logger.debug("DVP-SocialConnector.ReplyTweet Internal method ");
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


                        CreateEngagement("twitter", company, tenant, tweets.user.screen_name, tweets.in_reply_to_screen_name, "outbound", tweets.id_str, req.body.message,undefined, function (isSuccess, result) {

                            if (isSuccess) {
                                CreateComment('twitter','out_tweets',company, tenant,req.params.tid, undefined,result, function (done) {
                                    if(done){
                                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets successfully replied and comment created", true, result);
                                    }else{
                                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets successfully replied and comment failed", true, result);
                                    }
                                    res.end(jsonString);
                                });
                            } else {
                                logger.error("Tweet reply failed ");
                                res.end(jsonString);
                            }
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



module.exports.CreateTwitterAccount = CreateTwitterAccount;
module.exports.ActivateTwitterAccount = ActivateTwitterAccount;
module.exports.LoadTwitterMessages = LoadTwitterMessages;
module.exports.LoadTweets = LoadTweets;
module.exports.ReplyTweet = ReplyTweet;
module.exports.DeleteTwitterAccount = DeleteTwitterAccount;
module.exports.UpdateTwitterAccount = UpdateTwitterAccount;
module.exports.GetTwitterAccount = GetTwitterAccount;
module.exports.GetTwitterAccounts = GetTwitterAccounts;
module.exports.StreamTwitterMessages = StreamTwitterMessages;