module.exports = {


  TWITTER_KEY: 'dUTFwOCHWXpvuLSsgQ7zvOPRK',
  TWITTER_SECRET: 'KXDD9YRt58VddSTuYzvoGGGsNK5B5p9ElJ31WNLcZZkR4eVzp9',
  TWITTER_CALLBACK_URL:  'http://localhost:63342/DVP-AdminConsole/#/console/social/twitter',


  "DB": {
    "Type":"postgres",
    "User":"duo",
    "Password":"DuoS123",
    "Port":5432,
    "Host":"localhost",
    "Database":"dvpdb"
  },


  "Redis":
  {
    "ip": "45.55.142.207",
    "port": 6389,
    "user": "duo",
    "password": "DuoS123"

  },


  "Security":
  {
    "ip" : "45.55.142.207",
    "port": 6389,
    "user": "duo",
    "password": "DuoS123"
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


    "ip":"159.203.109.43",
    "port":"1401",
    "password":"bar",
    "user":"foo"



  },

  /*
  "SMPPClient":{

    "ip":"45.55.203.111",
    "port":"2775",
    "password":"pwd2",
    "user":"smppclient2"

  },
*/
  "SMPPClient":{

    "ip":"81.201.83.10",
    "port":"2777",
    "password":"Veery@123",
    "user":"veerysms"

  },



  "LBServer" : {

    "ip": "104.236.197.119",
    "port": "4647"

  },


  "Mongo":
  {
    "ip":"45.55.142.207",
    "port":"27017",
    "dbname":"dvpdb",
    "password":"DuoS123",
    "user":"duo"
  },



  "RabbitMQ":
  {
    "ip": "45.55.142.207",
    "port": 5672,
    "user": "admin",
    "password": "admin"
  },


  "Services" : {
    "accessToken":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",

    "resourceServiceHost": "resourceservice.app.veery.cloud",
    "resourceServicePort": "8831",
    "resourceServiceVersion": "1.0.0.0",


    "interactionurl": "interactions.app.veery.cloud",
    "interactionport": '3637',
    "interactionversion":"1.0",
    //


    "cronurl": "scheduleworker.app.veery.cloud",//scheduleworker.app.veery.cloud
    "cronport": '8080',
    "cronversion":"1.0.0.0",


    "ticketServiceHost": "liteticket.app.veery.cloud", //liteticket.app.veery.cloud
    "ticketServicePort": "3636",
    "ticketServiceVersion": "1.0.0.0",

    "ardsServiceHost": "ardsliteservice.app.veery.cloud",
    "ardsServicePort": "8831",
    "ardsServiceVersion": "1.0.0.0",

    "facebookUrl" : "https://graph.facebook.com/v2.8/"


  },

  "SocialConnector":
  {
    "fb_client_id":"1643344935974822",
    "fb_client_secret":"e85be3926e2189424f8c8c68986c275e",
    "owner_id":"124278164680278"
  }

};
