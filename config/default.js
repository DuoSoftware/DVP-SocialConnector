module.exports = {


  TWITTER_KEY: '',
  TWITTER_SECRET: '',
  TWITTER_CALLBACK_URL:  'http://localhost:63342/DVP-AdminConsole/#/console/social/twitter',


  "DB": {
    "Type":"postgres",
    "User":"",
    "Password":"",
    "Port":5432,
    "Host":"",
    "Database":""
  },


  "Redis":
  {
    "mode":"sentinel",//instance, cluster, sentinel
    "ip": "",
    "port": 6389,
    "user": "",
    "password": "",
    "sentinels":{
      "hosts": "",
      "port":16389,
      "name":"redis-cluster"
    }

  },


  "Security":
  {

    "ip" : "",
    "port": 6389,
    "user": "",
    "password": "",
    "mode":"sentinel",//instance, cluster, sentinel
    "sentinels":{
      "hosts": "",
      "port":16389,
      "name":"redis-cluster"
    }
  },


  "Host":
  {
    "ServerType": "SOCIALMEDIACONNECTOR",
    "CallbackOption": "GET",
    "RequestType": "CALL",
    "ServerID": 2,
    "resource": "cluster",
    "vdomain": "localhost",
    "domain": "localhost",
    "port": "4647",
    "smsQueueName": "SMSOUT",
    "smsmode": "smpp",
    'twitterQueueName': "TWEETOUT",
    'facebookQueueName': "FACEBOOKOUT",
    "version": "1.0.0.0"
  },



  "SMSServer":{


    "ip":"",
    "port":"1401",
    "password":"bar",
    "user":"foo"



  },

  
  "SMPPClient":{

    "ip":"",
    "port":"2777",
    "password":"",
    "user":""

  },



  "LBServer" : {

    "ip": "",
    "port": "4647"

  },


  "Mongo":
  {
    "ip":"",
    "port":"27017",
    "dbname":"",
    "password":"",
    "user":"",
    "replicaset" :""
  },



  "RabbitMQ":
  {
    "ip": "",
    "port": 5672,
    "user": "",
    "password": "",
    "vhost":'/'
  },


  "Services" : {
    "accessToken":"",

    "resourceServiceHost": "",
    "resourceServicePort": "8831",
    "resourceServiceVersion": "1.0.0.0",


    "interactionurl": "",
    "interactionport": '3637',
    "interactionversion":"1.0",
    //


    "cronurl": "",//scheduleworker.app.veery.cloud
    "cronport": '8080',
    "cronversion":"1.0.0.0",


    "ticketServiceHost": "", //liteticket.app.veery.cloud
    "ticketServicePort": "3636",
    "ticketServiceVersion": "1.0.0.0",

    "ardsServiceHost": "",
    "ardsServicePort": "8831",
    "ardsServiceVersion": "1.0.0.0",

    "facebookUrl" : "https://graph.facebook.com/v2.8/",

    "ruleserviceurl" : "",
    "ruleserviceport" : "8888",
    "ruleserviceversion" : "1.0.0.0",

    "fileServiceHost": "",
    "fileServicePort": 5645,
    "fileServiceVersion":"1.0.0.0"

  },

  "SocialConnector":
  {
   "fb_client_id":"",
   "fb_client_secret":"",
    "owner_id":""
  }

};
