module.exports = {
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


  "LBServer" : {

    "ip": "192.168.0.123",
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
    "user": "guest",
    "password": "guest"
  },

  "SMSServer":{


    "ip":"159.203.109.43",
    "port":"1401",
    "password":"bar",
    "user":"foo"



  },


  "Services" : {
    "accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTTFRfVGVzdCIsImp0aSI6ImZiNjk1YjgzLTg4NjYtNDc3Mi1iZjhmLThiYWMyMGQ4NmE3NiIsInN1YiI6IkFjY2VzcyBjbGllbnQiLCJleHAiOjE0NzY4MTAzOTYsInRlbmFudCI6MSwiY29tcGFueSI6MTAzLCJhdWQiOiJteWFwcCIsImNvbnRleHQiOnsicmVzb3VyY2VpZCI6IjcwIiwidmVlcnlhY2NvdW50Ijp7InR5cGUiOiJzaXAiLCJ2ZXJpZmllZCI6dHJ1ZSwiZGlzcGxheSI6IjU5NDMiLCJjb250YWN0Ijoic2x0X3Rlc3RAZHVvLm1lZGlhMS52ZWVyeS5jbG91ZCJ9fSwic2NvcGUiOlt7InJlc291cmNlIjoibXlOYXZpZ2F0aW9uIiwiYWN0aW9ucyI6WyJyZWFkIl19LHsicmVzb3VyY2UiOiJteVVzZXJQcm9maWxlIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InBieGFkbWluIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InBieHVzZXIiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoic2lwdXNlciIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJzY2hlZHVsZSIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJmaWxlc2VydmljZSIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJwYWNrYWdlIiwiYWN0aW9ucyI6WyJyZWFkIl19LHsicmVzb3VyY2UiOiJub3RpZmljYXRpb24iLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoiYXJkc3Jlc291cmNlIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InJlcXVlc3RtZXRhIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InN5c21vbml0b3JpbmciLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoiZXZlbnRzIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6ImV4dGVybmFsVXNlciIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJ1c2VyR3JvdXAiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoidXNlciIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJlbmdhZ2VtZW50IiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6ImluYm94IiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX0seyJyZXNvdXJjZSI6InRpY2tldCIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJ0YWciLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoidGltZXIiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoidGlja2V0dmlldyIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJmb3JtcyIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJkYXNoYm9hcmRldmVudCIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJkYXNoYm9hcmRncmFwaCIsImFjdGlvbnMiOlsicmVhZCIsIndyaXRlIiwiZGVsZXRlIl19LHsicmVzb3VyY2UiOiJwcm9kdWN0aXZpdHkiLCJhY3Rpb25zIjpbInJlYWQiLCJ3cml0ZSIsImRlbGV0ZSJdfSx7InJlc291cmNlIjoic29jaWFsIiwiYWN0aW9ucyI6WyJyZWFkIiwid3JpdGUiLCJkZWxldGUiXX1dLCJpYXQiOjE0NzYyMDU1OTZ9.DnONWrE61H2yOys3XOjdvOCv9ftsrefHlPChBu1pmJE",

    "resourceServiceHost": "resourceservice.app.veery.cloud",
    "resourceServicePort": "8831",
    "resourceServiceVersion": "1.0.0.0",


    "interactionurl": "interactions.app.veery.cloud",
    "interactionport": '3637',
    "interactionversion":"1.0",


    "cronurl": "192.168.0.27",
    "cronport": '8080',
    "cronversion":"1.0.0.0",


    "ticketServiceHost": "liteticket.app.veery.cloud",
    "ticketServicePort": "3636",
    "ticketServiceVersion": "1.0.0.0",

    "ardsServiceHost": "ardsliteservice.app.veery.cloud",
    "ardsServicePort": "8831",
    "ardsServiceVersion": "1.0.0.0",

    "facebookUrl" : "https://graph.facebook.com/v2.7/"


  }



};
