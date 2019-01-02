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
var StartStopCronJob = require('../Workers/common').StartStopCronJob;
var util = require('util');
var validator = require('validator');
var format = require("stringformat");
var qs = require('querystring');
var request = require("request");
var async = require("async");

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var _twitterConsumerKey = config.TwitterConnector.Consumer_Key;
var _twitterConsumerSecret = config.TwitterConnector.Consumer_Secret;
var _environment = config.TwitterConnector.environment;
var _callbackURL = config.TwitterConnector.callbackURL;

var oauth = require('oauth');
var serverID = config.Host.ServerID;
var serverType = config.Host.ServerType;

//http://localhost:3636/DVP/API/1.0.0.0/TicketByEngagement/754236638146859008/Comment

function GetProfile(req, res) {

    // var consumer = new oauth.OAuth(
    //     "https://twitter.com/oauth/request_token", "https://twitter.com/oauth/access_token",
    //     req.body.oauth_token, req.body.oauth_verifier, "1.0A", "http://127.0.0.1:8080/sessions/callback", "HMAC-SHA1");
    //
    // consumer.get("https://api.twitter.com/1.1/account/verify_credentials.json", req.body.oauth_token, req.body.oauth_verifier, function (error, data, response) {
    //     if (error) {
    //         res.redirect('/sessions/connect');
    //         // res.send("Error getting twitter screen name : " + util.inspect(error), 500);
    //     } else {
    //         var parsedData = JSON.parse(data);
    //
    //         var data = {
    //             id: parsedData.id_str,
    //             name: parsedData.name,
    //             screen_name: parsedData.screen_name,
    //             access_token_key: req.session.oauthAccessToken,
    //             access_token_secret: req.session.oauthAccessTokenSecret
    //         };
    //     }}
    //     );


    var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
    var accessTokenOauth = {
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        token: req.body.oauth_token,
        verifier: req.body.oauth_verifier
    };

    // Step 3. Exchange oauth token and oauth verifier for access token.
    request.post({url: accessTokenUrl, oauth: accessTokenOauth}, function (err, response, accessToken) {

        var accessToken = qs.parse(accessToken);

        var client = new TwitterClient({
            consumer_key: _twitterConsumerKey,
            consumer_secret: _twitterConsumerSecret,
            access_token_key: accessToken.oauth_token,
            access_token_secret: accessToken.oauth_token_secret
        });

        client.get('account/verify_credentials', function (error, tweets, response) {
            if (error) throw error;
            var tweetProfile = {};
            tweetProfile.id = tweets.id;
            tweetProfile.avatar = tweets.profile_image_url;
            tweetProfile.name = tweets.name;
            tweetProfile.access_token_key = accessToken.oauth_token;
            tweetProfile.access_token_secret = accessToken.oauth_token_secret;

            /*var jsonString = "";
             if (error) {
             jsonString = messageFormatter.FormatMessage(undefined, "Fail To Get Profile", false, error);
             }
             else {
             jsonString = messageFormatter.FormatMessage(undefined, "Profile", true, tweetProfile);
             }
             res.end(jsonString);*/

            req.body.id = tweets.id;
            req.body.name = tweets.name;
            req.body.screen_name = tweets.screen_name;
            req.body.access_token_key = accessToken.oauth_token;
            req.body.access_token_secret = accessToken.oauth_token_secret;
            req.body.ticket_type = 'question';
            req.body.ticket_tags = [];
            req.body.ticket_priority = 'normal';
            CreateTwitterAccount(req, res)
        });

    });


}

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
        screen_name: req.body.screen_name,
        access_token_key: req.body.access_token_key,
        access_token_secret: req.body.access_token_secret,
        ticket_type: req.body.ticket_type,
        ticket_tags: req.body.ticket_tags,
        ticket_priority: req.body.ticket_priority,
        created_at: Date.now(),
        updated_at: Date.now(),
        cron: false,
        status: true
    });


    var client = new TwitterClient({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: twitter.access_token_key,
        access_token_secret: twitter.access_token_secret
    });
    var params = {};


    twitter.save(function (err, twee) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Twitter account save failed", false, undefined);
            res.end(jsonString);
        } else {

            client.post('account_activity/all/' + _environment + '/subscriptions', params).then(function (acc) {

                Twitter.findOneAndUpdate({_id: req.body.id}, {subscribed:  true}, function (err, tww) {
                    if (err) {

                        logger.error('Update twitter subscribed status failed', err);

                    } else {

                        logger.info('Update twitter subscribed status success');
                    }

                    jsonString = messageFormatter.FormatMessage(undefined, "Twitter and account subscription saved successfully", true, twee);
                    res.end(jsonString);
                });

            }).catch(function (err) {

                jsonString = messageFormatter.FormatMessage(err, "Twitter callback subscription failed", false, undefined);
                res.end(jsonString);

            });
        }


    });

    // twitter.save(function (err, twee) {
    //     if (err) {
    //         jsonString = messageFormatter.FormatMessage(err, "Twitter save failed", false, undefined);
    //         res.end(jsonString);
    //     } else {
    //
    //         //var mainServer = format("http://{0}/DVP/API/{1}/Social/Twitter/{2}/directmessages", config.LBServer.ip, config.Host.version, twee._id);
    //
    //         //if (validator.isIP(config.LBServer.ip))
    //         //    mainServer = format("http://{0}:{1}/DVP/API/{2}/Social/Twitter/{3}/directmessages", config.LBServer.ip, config.LBServer.port, config.Host.version, twee._id);
    //
    //
    //
    //
    //         // RegisterCronJob(company, tenant, 10, req.body.id, mainServer, function (isSuccess) {
    //         //
    //         //     if (isSuccess) {
    //         //         jsonString = messageFormatter.FormatMessage(undefined, "Twitter and cron saved successfully", true, twee);
    //         //         res.end(jsonString);
    //         //     }
    //         //     else {
    //         //         jsonString = messageFormatter.FormatMessage(undefined, "Twitter saved but cron failed", false, twee);
    //         //         Twitter.findOneAndUpdate({_id: twee._id}, {cron: {enable: false}}, function (err, tww) {
    //         //             if (err) {
    //         //
    //         //                 logger.error('Update twitter cron status failed', err);
    //         //
    //         //             } else {
    //         //
    //         //                 logger.info('Update twitter cron status success');
    //         //             }
    //         //         });
    //         //
    //         //         res.end(jsonString);
    //         //     }
    //         // });
    //     }
    // });
}

function TwitterStartCron(req, res) {


    logger.debug("DVP-SocialConnector.TwitterStartCron Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    var id = req.params.id;
    var mainServer = format("http://{0}/DVP/API/{1}/Social/Twitter/{2}/directmessages", config.LBServer.ip, config.Host.version, id);

    if (validator.isIP(config.LBServer.ip))
        mainServer = format("http://{0}:{1}/DVP/API/{2}/Social/Twitter/{3}/directmessages", config.LBServer.ip, config.LBServer.port, config.Host.version, id);

    StartStopCronJob(company, tenant, req.params.id,'stop', function (isSuccess) {
        logger.info('DeleteTwitterAccount. stop cron' + isSuccess);
        if (isSuccess) {
            jsonString = messageFormatter.FormatMessage(undefined, "Cron saved successfully", true, undefined);
            Twitter.findOneAndUpdate({_id: req.params.id}, {cron: {enable: true}}, function (err, tww) {
                if (err) {

                    logger.error('Update twitter cron status failed', err);

                } else {

                    logger.info('Update twitter cron status success');
                }
            });
            res.end(jsonString);
        }
        else {
            RegisterCronJob(company, tenant, 10, id, mainServer, function (isSuccess) {

                if (isSuccess) {
                    jsonString = messageFormatter.FormatMessage(undefined, "Cron saved successfully", true, undefined);
                    Twitter.findOneAndUpdate({_id: req.params.id}, {cron: {enable: true}}, function (err, tww) {
                        if (err) {

                            logger.error('Update twitter cron status failed', err);

                        } else {

                            logger.info('Update twitter cron status success');
                        }
                    });
                    res.end(jsonString);
                }
                else {
                    jsonString = messageFormatter.FormatMessage(undefined, "Cron save failed", false, undefined);
                    res.end(jsonString);
                }
            });
        }
    });



}

function DeleteTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.DeleteTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    var twitterx = Twitter({
        status: false,
        updated_at: Date.now(),
    });

    Twitter.findOne({_id: req.params.id, company: company, tenant: tenant}, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter account failed", false, undefined);
        } else {
            if (twitter) {


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {};


                client.delete('account_activity/all/' + _environment + '/subscriptions', params).then(function (acc) {
                    Twitter.findOneAndUpdate({
                        _id: req.params.id,
                        company: company,
                        tenant: tenant
                    }, twitterx, function ( twittery) {

                        Twitter.findOneAndUpdate({_id: twitter._id}, {subscribed:  false}, function (err, tww) {
                            if (err) {

                                logger.error('Update twitter subscribed status failed', err);

                            } else {

                                logger.info('Update twitter subscribed status success');
                            }

                            jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter account Success", true, twittery);
                            res.end(jsonString);
                        });
                    });

                }).catch(function (err) {

                    jsonString = messageFormatter.FormatMessage(err, "Delete twitter webhooks failed", false, undefined);
                    res.end(jsonString);
                });


            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
                res.end(jsonString);
            }
        }

    });
}

function ActivateTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.ActivateTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;

    Twitter.findOne({_id: req.params.id, company: company, tenant: tenant}, twitter, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Activate Twitter account failed", false, undefined);
            res.end(jsonString);
        } else {

            if(twitter && twitter.webhook_id){

                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {};


                client.put('account_activity/all/'+_environment+'/webhooks/'+twitter.webhook_id, params).then(function(acc){
                    jsonString = messageFormatter.FormatMessage(undefined, "Activate Twitter webhook Success", true, twitter);
                    res.end(jsonString);

                }).catch(function(err){

                    jsonString = messageFormatter.FormatMessage(err, "Activate Twitter webhook failed", false, undefined);
                    res.end(jsonString);
                });

            }else{

                jsonString = messageFormatter.FormatMessage(undefined, "Activate Twitter account failed No webhook found", false, undefined);
                res.end(jsonString);

            }
        }

    });
}

function StreamTwitterMessages(req, res) {


    logger.debug("DVP-SocialConnector.LoadTwitterMessages Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function (err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        } else {

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


                                        //channel, company, tenant, from, to, direction, session, data, user,channel_id,contact,  cb
                                        CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, user,item.user.id_str,item.user, function (isSuccess, result) {
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

    Twitter.findOneAndUpdate({_id: req.params.id, company: company, tenant: tenant}, twitter, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Update Twitter account failed", false, undefined);
        } else {
            jsonString = messageFormatter.FormatMessage(undefined, "Update Twitter account Success", true, twitter);
        }
        res.end(jsonString);
    });


};

function SubscribeTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.SubscribeTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;


    Twitter.findOne({_id: req.params.id, company: company, tenant: tenant}, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter account failed", false, undefined);
        } else {
            if (twitter) {


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {};


                client.post('account_activity/all/'+_environment+'/subscriptions', params).then(function(acc){


                    Twitter.findOneAndUpdate({_id: twitter._id}, {subscribed:  true}, function (err, tww) {
                        if (err) {

                            logger.error('Update twitter subscribed status failed', err);

                        } else {

                            logger.info('Update twitter subscribed status success');
                        }

                        jsonString = messageFormatter.FormatMessage(undefined, "Twitter subscription Success", true, twitter);
                        res.end(jsonString);
                    });



                }).catch(function(err){

                    jsonString = messageFormatter.FormatMessage(err, "Twitter subscription failed", false, undefined);
                    res.end(jsonString);
                });



            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
                res.end(jsonString);
            }
        }

    });

};

function UnSubscribeTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.UnSubscribeTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;


    Twitter.findOne({_id: req.params.id, company: company, tenant: tenant}, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter account failed", false, undefined);
        } else {
            if (twitter) {


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {};


                client.delete('account_activity/all/'+_environment+'/subscriptions', params).then(function(acc){

                    Twitter.findOneAndUpdate({_id: twitter._id}, {subscribed:  true}, function (err, tww) {
                        if (err) {

                            logger.error('Update twitter subscribed status failed', err);

                        } else {

                            logger.info('Update twitter subscribed status success');
                        }

                        jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter subscription Success", true, twitter);
                        res.end(jsonString);
                    });

                }).catch(function(err){

                    jsonString = messageFormatter.FormatMessage(err, "Delete user subscription failed", false, undefined);
                    res.end(jsonString);
                });



            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
                res.end(jsonString);
            }
        }

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

function GetTwitterAccount(req, res) {


    logger.debug("DVP-SocialConnector.GetTwitterAccount Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    Twitter.findOne({_id: req.params.id, company: company, tenant: tenant}, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter account failed", false, undefined);
        } else {
            if (twitter) {
                jsonString = messageFormatter.FormatMessage(undefined, "Get Twitter account Success", true, twitter);
            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter account found", false, undefined);
            }
        }
        res.end(jsonString);
    });

};

function GetTwitterAccounts(req, res) {


    logger.debug("DVP-SocialConnector.GetTwitterAccounts Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;
    Twitter.find({company: company, tenant: tenant}, function (err, twitter) {
        if (err) {
            jsonString = messageFormatter.FormatMessage(err, "Get Twitter accounts failed", false, undefined);
        } else {
            if (twitter && twitter.length > 0) {
                jsonString = messageFormatter.FormatMessage(undefined, "Get Twitter accounts Success", true, twitter);
            } else {

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

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function (err, twitter) {


        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

            logger.Error(err);

        } else {

            if (twitter) {

                logger.info('twitter account found');


                jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);


                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });


                var params = {screen_name: 'nodejs', trim_user: true};

                if (twitter.direct_messages_since > 0)
                    params = {
                        screen_name: 'nodejs',
                        trim_user: true,
                        since_id: twitter.direct_messages_since,
                        count: 200
                    };

                client.get('direct_messages', params, function (error, tweets, response) {
                    if (!error) {
                        //console.log(tweets);


                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets found", true, undefined);


                        if (util.isArray(tweets) && tweets.length > 0) {

                            var since_id = tweets[0].id_str;

                            twitter.direct_messages_since = since_id;

                            Twitter.findOneAndUpdate({
                                company: company,
                                tenant: tenant,
                                _id: req.params.id
                            }, {$set: {direct_messages_since: since_id}}, function (err, doc) {
                                if (err) {

                                    logger.error("Update since id failed" + err);

                                } else {


                                    logger.debug("Update since id successfully");
                                    //////////////////////////////////////////////////////////////////////////////////////////////////////
                                    tweets.forEach(function (item) {


                                        //channel, company, tenant, from, to, direction, session, data, user,channel_id,contact,  cb
                                        CreateEngagement("twitter", company, tenant, item.sender_screen_name, item.recipient_screen_name, "inbound", item.id_str, item.text, undefined, function (isSuccess, result) {

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

                    } else {
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                        res.end(jsonString);
                        logger.info('twitter client error', error);

                    }
                });


            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

                logger.error("No Twitter Found");
            }
        }


    });
};

function LoadTweets(req, res) {


    logger.debug("DVP-SocialConnector.LoadTweets Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);

    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function (err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        } else {
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
                var params = {screen_name: 'nodejs', trim_user: true};
                if (twitter.tweet_since > 0)
                    params = {screen_name: 'nodejs', since_id: twitter.tweet_since, count: 200};
                client.get('statuses/mentions_timeline', params, function (error, tweets, response) {
                    if (!error) {
                        //console.log(tweets);
                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets found", true, undefined);
                        if (util.isArray(tweets) && tweets.length > 0) {

                            var ticketList = [];
                            var commentList = [];



                            tweets.forEach(function (item){
                                if (item.in_reply_to_status_id_str)
                                {
                                    commentList.push(item);
                                }
                                else{
                                    ticketList.push(item);
                                }
                            });


                            var TicketTask = [];
                            ticketList.forEach(function (item) {
                                TicketTask.push(function createContact(callback) {

                                    //channel, company, tenant, from, to, direction, session, data, user,channel_id,contact,  cb
                                    CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined,item.user.id_str,item.user, function (isSuccess, result) {
                                        if (isSuccess) {

                                            CreateTicket("twitter", item.id_str, result.profile_id, company, tenant, ticket_type, item.text, item.text, ticket_priority, ticket_tags, function (done) {
                                                if (done) {


                                                    logger.info("Twitter Ticket Added successfully " + item.id_str);


                                                } else {

                                                    logger.error("Add Request failed " + item.id);

                                                }
                                                callback(null,  item.id_str);
                                            });

                                        } else {
                                            logger.error("Create engagement failed " + item.id);
                                            callback(null,  item.id_str);
                                        }
                                    });
                                });
                            });

                            var CommentTask = [];
                            commentList.forEach(function (item) {
                                CommentTask.push(function createContact(callback) {

                                    CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined,item.user.id_str,item.user, function (isSuccess, result) {
                                        if (isSuccess) {
                                            CreateComment('twitter', 'tweets', company, tenant, item.in_reply_to_status_id_str, undefined, result, function (done) {
                                                if (!done) {

                                                    CreateTicket("twitter", item.id_str, result.profile_id, company, tenant, ticket_type, item.text, item.text, ticket_priority, ticket_tags, function (done) {
                                                        if (done) {
                                                            logger.info("Twitter Ticket Added successfully " + item.id_str);

                                                        } else {

                                                            logger.error("Create Ticket failed " + item.id);

                                                        }
                                                        callback(null,  item.id_str);
                                                    });
                                                } else {

                                                    logger.info("Twitter Comment Added successfully " + item.id_str);
                                                    callback(null,  item.id_str);
                                                }

                                            })
                                        } else {

                                            logger.error("Create engagement failed " + item.id);
                                            callback(null,  item.id_str);
                                        }
                                    })
                                });
                            });

                            async.parallel(TicketTask, function (err, result) {
                                async.parallel(CommentTask, function (err, result) {
                                    console.log("done..................")
                                });
                            });

                            /*function saveTicket() {
                                ticketList.forEach(function (item) {

                                    CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined, function (isSuccess, result) {
                                        if (isSuccess) {

                                            CreateTicket("twitter", item.id_str, result.profile_id, company, tenant, ticket_type, item.text, item.text, ticket_priority, ticket_tags, function (done) {
                                                if (done) {


                                                    logger.info("Twitter Ticket Added successfully " + item.id_str);


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

                            function saveComment() {
                                commentList.forEach(function (item) {

                                    CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined, function (isSuccess, result) {
                                        if (isSuccess) {
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

                                            logger.error("Create engagement failed " + item.id);

                                        }
                                    })

                                });
                            }*/


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
                                }
                            });


                            //-------------------
                            /*var since_id = tweets[0].id_str;
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
                                        CreateEngagement("twitter", company, tenant, item.user.screen_name, item.in_reply_to_screen_name, "inbound", item.id_str, item.text, undefined,item.user.id_str,item.user, function (isSuccess, result) {
                                            if (isSuccess) {
                                                //////////////////////////////////////fresh one we add to ards//////////////////////////////////////
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
                                    });
                                }
                            });*/
                        } else {
                            jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                            res.end(jsonString);
                        }
                    } else {
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                        res.end(jsonString);
                    }
                });

            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);

            }
        }
    });
};

function ReplyTweet(req, res) {

    logger.debug("DVP-SocialConnector.ReplyTweet Internal method ");
    var jsonString;
    var tenant = parseInt(req.user.tenant);
    var company = parseInt(req.user.company);
    Twitter.findOne({company: company, tenant: tenant, _id: req.params.id}, function (err, twitter) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Get Twitter Failed", false, undefined);
            res.end(jsonString);

        } else {
            if (twitter) {
                jsonString = messageFormatter.FormatMessage(err, "Get Twitter Successful", true, twitter);
                var client = new TwitterClient({
                    consumer_key: _twitterConsumerKey,
                    consumer_secret: _twitterConsumerSecret,
                    access_token_key: twitter.access_token_key,
                    access_token_secret: twitter.access_token_secret
                });
                var params = {
                    status: "@" + req.body.to + " " + req.body.message,
                    in_reply_to_status_id: req.params.tid
                };
                client.post('statuses/update', params, function (error, tweets, response) {
                    if (!error) {
                        //console.log(tweets);


                        CreateEngagement("twitter", company, tenant, tweets.user.screen_name, tweets.in_reply_to_screen_name, "outbound", tweets.id_str, req.body.message, undefined,undefined,undefined, function (isSuccess, result) {

                            if (isSuccess) {
                                CreateComment('twitter', 'out_tweets', company, tenant, req.params.tid, undefined, result, function (done) {
                                    if (done) {
                                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets successfully replied and comment created", true, result);
                                    } else {
                                        jsonString = messageFormatter.FormatMessage(undefined, "Tweets successfully replied and comment failed", true, result);
                                    }
                                    res.end(jsonString);
                                });
                            } else {
                                logger.error("Tweet reply failed ");
                                res.end(jsonString);
                            }
                        })

                    } else {
                        jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, response);
                        res.end(jsonString);
                    }
                });
            } else {
                jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, undefined);
                res.end(jsonString);
            }
        }
    });


}

function GetTwitterOauthToken(req, res) {


    var requestTokenUrl = 'https://api.twitter.com/oauth/request_token';
    var accessTokenUrl = 'https://api.twitter.com/oauth/access_token';
    var profileUrl = 'https://api.twitter.com/1.1/account/verify_credentials.json';


    var requestTokenOauth = {
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        callback: config.TWITTER_CALLBACK_URL
    };

    // Step 1. Obtain request token for the authorization popup.
    request.post({url: requestTokenUrl, oauth: requestTokenOauth}, function (err, response, body) {
        var jsonString = "";
        if (err) {
            jsonString = messageFormatter.FormatMessage(undefined, "No Twitter Found", false, response);
            res.end(jsonString);
        }
        else {

            var oauthToken = qs.parse(body);

            // Step 2. Send OAuth token back to open the authorization screen.
            //res.send(oauthToken);
            jsonString = messageFormatter.FormatMessage(undefined, "Twitter Found", true, oauthToken);
            res.end(jsonString);
        }

    });
}

function CreateTwitterWebhook(req, res) {

    ///////////////////////////////crate a twitter webhook//////////////////
    var client = new TwitterClient({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.body.access_token_key,
        access_token_secret: req.body.access_token_secret
    });
    var params = {
        url: encodeURI(_callbackURL)
    };
    var jsonString;

    client.post('account_activity/all/' + _environment + '/webhooks', params).then(function (acc) {
        if (acc && acc.id) {


            jsonString = messageFormatter.FormatMessage(undefined, "Twitter and account subscription saved successfully", true, acc);
            res.end(jsonString);

        } else {

            jsonString = messageFormatter.FormatMessage(undefined, "Twitter subscription save failed", false, undefined);
            res.end(jsonString);
        }

    }).catch(function (err) {

        jsonString = messageFormatter.FormatMessage(err, "Twitter callback subscription failed", false, undefined);
        res.end(jsonString);

    });
}

function GetTwitterWebhook(req, res) {

    ///////////////////////////////crate a twitter webhook//////////////////
    var client = new TwitterClient({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.params.access_token_key,
        access_token_secret: req.params.access_token_secret
    });
    var params = {};
    var jsonString;

    client.get('account_activity/all/' + _environment + '/webhooks', params).then(function (acc) {
        if (acc) {


            jsonString = messageFormatter.FormatMessage(undefined, "Twitter and account subscription get successfully", true, acc);
            res.end(jsonString);

        } else {

            jsonString = messageFormatter.FormatMessage(undefined, "Twitter subscription get failed", false, undefined);
            res.end(jsonString);
        }

    }).catch(function (err) {

        jsonString = messageFormatter.FormatMessage(err, "Twitter callback subscription get failed", false, undefined);
        res.end(jsonString);

    });
}

function DeleteTwitterWebhook(req,res) {

    //////////////////find a way to store twitter webhook////////////////////////////
    var client = new TwitterClient({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.body.access_token_key,
        access_token_secret: req.body.access_token_secret
    });
    var params = {};
    var jsonString;

    client.delete('account_activity/all/' + _environment + '/webhooks/' + req.params.id, params).then(function (acc) {

        jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter account Success", true, acc);
        res.end(jsonString);


    }).catch(function (err) {

        jsonString = messageFormatter.FormatMessage(err, "Delete twitter webhooks failed", false, undefined);
        res.end(jsonString);
    });

}

function UnSubscribeTwitterHook(req, res) {


    logger.debug("DVP-SocialConnector.UnSubscribeTwitterHook Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    var jsonString;


    var client = new TwitterClient({
        consumer_key: _twitterConsumerKey,
        consumer_secret: _twitterConsumerSecret,
        access_token_key: req.body.access_token_key,
        access_token_secret: req.body.access_token_secret
    });
    var params = {};


    client.delete('account_activity/all/' + _environment + '/subscriptions', params).then(function (acc) {
        jsonString = messageFormatter.FormatMessage(undefined, "Delete Twitter subscription Success", true, acc);
        res.end(jsonString);

    }).catch(function (err) {

        jsonString = messageFormatter.FormatMessage(err, "Delete user subscription failed", false, undefined);
        res.end(jsonString);
    });

};


module.exports.GetProfile = GetProfile;
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
module.exports.TwitterStartCron = TwitterStartCron;
module.exports.GetTwitterOauthToken = GetTwitterOauthToken;
module.exports.SubscribeTwitterAccount = SubscribeTwitterAccount;
module.exports.UnSubscribeTwitterAccount = UnSubscribeTwitterAccount;
module.exports.CreateTwitterWebhook = CreateTwitterWebhook;
module.exports.GetTwitterWebhook = GetTwitterWebhook;
module.exports.DeleteTwitterWebhook = DeleteTwitterWebhook;
module.exports.UnSubscribeTwitterHook = UnSubscribeTwitterHook;
