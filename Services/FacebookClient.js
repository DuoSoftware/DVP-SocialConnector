/**
 * Created by Rajinda on 7/18/2016.
 */

var request = require("request");
var mongoose = require('mongoose');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var SocialConnector = require('dvp-mongomodels/model/SocialConnector').SocialConnector;
var async = require("async");
var moment = require('moment');
var config = require('config');

var baseUrl = "https://graph.facebook.com/v2.7/";

/*var authorization = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkdW9vd25lciIsImp0aSI6IjI1NmZhMjNiLTQ3YTAtNDU0NS05ZGYxLTAxMWIwZDdjYWViOSIsInN1YiI6IkFjY2VzcyBjbGllbnQiLCJleHAiOjIwNjg1ODA5MjIsInRlbmFudCI6MSwiY29tcGFueSI6MTAzLCJhdWQiOiJteWFwcCIsImNvbnRleHQiOnt9LCJzY29wZSI6W3sicmVzb3VyY2UiOiJ0aWNrZXQiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoic2xhIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InRyaWdnZXJzIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX1dLCJpYXQiOjE0Njc5NzYxMjJ9.05YMBXY5PgTJZpY6qJA0YVgeXtND0aMiCU85fvOvDJc";*/
var authorization;

module.exports.GetFbPostList = function (req, res) {


    logger.info("DVP-LiteTicket.GetFbPostList Internal method ");

    var company = parseInt(req.user.company);
    var tenant = parseInt(req.user.tenant);
    authorization = req.headers['authorization'];
    var jsonString;
    SocialConnector.find({company: company, tenant: tenant}, function (err, fbConnectors) {
        if (err) {

            jsonString = messageFormatter.FormatMessage(err, "Fail To Find Social Connector Settings.", false, undefined);
            res.end(jsonString);

        } else {

            if (fbConnectors.length > 0) {

                // Array to hold async tasks
                var asyncTasks = [];
                fbConnectors.forEach(function (item) {

                    asyncTasks.push(function (callback) {
                        var propertiesObject = {
                            access_token: item.fb.access_token,
                            fields: 'id,message,from,to,created_time,comments',
                            since: item.fb.lastUpdate
                        };
                        var options = {
                            method: 'GET',
                            uri: baseUrl + item.fb.pageID + '/feed',
                            qs: propertiesObject,
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        };

                        request(options, function (error, response, body) {

                            var jsonResp = {};
                            if (error) {
                                jsonResp.error = error;
                            }
                            else if (response.statusCode != 200 || error) {
                                jsonResp.error = response.body;
                            }
                            else {
                                error = undefined;
                                jsonResp = JSON.parse(body);
                                jsonResp.fbConnector = item.toJSON();
                                jsonResp.statusCode = response.statusCode;
                            }
                            callback(error, jsonResp);
                            var updateT = moment().unix();
                            item.update({
                                "$set": {
                                    "fb.lastUpdate": updateT
                                }
                            }, function (err, obf) {
                                console.info("Update .....");
                            });
                        });

                    });
                });
                async.parallel(asyncTasks,
                    function (err, results) {
                        if (!err) {
                            // process data and create ticket
                            processFacebookWallData(results);
                        }
                    });

                jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, "Process Start.");
                res.end(jsonString);


            } else {

                jsonString = messageFormatter.FormatMessage(undefined, "Fail To Find Social Connector Settings.", false, undefined);
                res.end(jsonString);
            }
        }
    });
};

var processFacebookWallData = function (fbData) {

    if (fbData) {
        var createTicketTasks = [];
        fbData.forEach(function (item) {
            if (!item.error) {
                if (item.data) {
                    item.data.forEach(function (wallpost) {
                        CreateEngagement("facebook", item.fbConnector.company, item.fbConnector.tenant, JSON.stringify(wallpost.from), JSON.stringify(wallpost.to), "inbound", wallpost.id, wallpost.message, function (isSuccess, engagement) {

                            if (isSuccess) {

                                /*Create Tickets*/
                                var ticketData = {
                                    "type": "question",
                                    "subject": "Facebook Wall Post",
                                    "reference": wallpost.id,
                                    "description": wallpost.message,
                                    "priority": "normal",
                                    "status": "new",
                                    "requester": wallpost.from.id,
                                    "engagement_session": engagement.engagement_id,
                                    "channel": JSON.stringify(wallpost.from),
                                    "tags": ["complain.product.tv.display"],
                                    "custom_fields": [{"field": "123", "value": "12"}],
                                    "fbComments": wallpost.comments.data
                                };
                                /*var ticketUrl = "http://localhost:3636/DVP/API/1.0/Ticket/Comments";*/
                                var ticketUrl = format("http://{0}/DVP/API/{1}/Ticket/Comments", config.Services.ticketServiceHost, config.Services.ticketServiceVersion);
                                createTicketTasks.push(function (callback) {
                                    var options = {
                                        method: 'POST',
                                        uri: ticketUrl,
                                        headers: {
                                            Accept: 'application/json',
                                            authorization: "Bearer " + config.Services.accessToken,
                                            companyinfo: format("{0}:{1}", item.fbConnector.tenant, item.fbConnector.company)
                                        },
                                        body: JSON.stringify(ticketData)
                                    };

                                    request(options, function (error, response, body) {
                                        callback(error, response);
                                    });

                                });
                                /*Create Tickets*/
                            }
                            else {
                                logger.error("Create engagement failed " + wallpost.id);
                            }
                        });



                    });
                }
            }


        });

        if (createTicketTasks.length > 0) {
            async.parallel(createTicketTasks,
                function (err, results) {
                    if (!err) {
                        console.info("create Ticket");
                    }
                });
        }

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

function CreateComment(company, tenant, engid, engagement, cb) {

    //http://localhost:3636/DVP/API/1.0.0.0/TicketByEngagement/754236638146859008/Comment

    if (config.Services && config.Services.ticketServiceHost && config.Services.ticketServicePort && config.Services.ticketServiceVersion) {

        var url = format("http://{0}/DVP/API/{1}/TicketByEngagement/{2}/Comment", config.Services.ticketServiceHost, config.Services.ticketServiceVersion, engagement._id);
        if (validator.isIP(config.Services.ticketServiceHost))
            url = format("http://{0}:{1}/DVP/API/{2}/TicketByEngagement/{3}/Comment", config.Services.ticketServiceHost, config.Services.ticketServicePort, config.Services.ticketServiceVersion, engid);


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

                    logger.error("Registration Failed " + _error);
                    cb(false);

                }
            }
            catch (excep) {

                logger.error("Registration Failed " + excep);
                cb(false);
            }

        });

    }

}

function CreateEngagement(channel, company, tenant, from, to, direction, session, data, cb) {

    if ((config.Services && config.Services.interactionurl && config.Services.interactionport && config.Services.interactionversion)) {


        var engagementURL = format("http://{0}/DVP/API/{1}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionversion);
        if (validator.isIP(config.Services.interactionurl))
            engagementURL = format("http://{0}:{1}/DVP/API/{2}/EngagementSessionForProfile", config.Services.interactionurl, config.Services.interactionport, config.Services.interactionversion);

        var engagementData = {
            engagement_id: session,
            channel: channel,
            direction: direction,
            channel_from: from,
            channel_to: to,
            body: data
        };

        logger.debug("Calling Engagement service URL %s", engagementURL);
        request({
            method: "POST",
            url: engagementURL,
            headers: {
                authorization: "bearer " + token,
                companyinfo: format("{0}:{1}", tenant, company)
            },
            json: engagementData
        }, function (_error, _response, datax) {

            try {

                if (!_error && _response && _response.statusCode == 200, _response.body && _response.body.IsSuccess) {

                    cb(true, _response.body.Result);

                } else {

                    logger.error("There is an error in  create engagements for this session " + session);
                    cb(false, {});


                }
            }
            catch (excep) {

                cb(false, {});

            }
        });
    }
};
