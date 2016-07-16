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
    "version": "1.0"
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

    "Services" : {
      "accessToken":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiMTdmZTE4M2QtM2QyNC00NjQwLTg1NTgtNWFkNGQ5YzVlMzE1Iiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE4OTMzMDI3NTMsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NjEyOTkxNTN9.YiocvxO_cVDzH5r67-ulcDdBkjjJJDir2AeSe3jGYeA",


      "resourceServiceHost": "resourceservice.104.131.67.21.xip.io",
      "resourceServicePort": "8831",
      "resourceServiceVersion": "1.0.0.0",


      "interactionurl": "127.0.0.1",
      "interactionport": '3637',
      "interactionversion":"1.0.0.0",


      "cronurl": "192.168.0.27",
      "cronport": '8080',
      "cronversion":"1.0.0.0",


      "ticketServiceHost": "127.0.0.1",
      "ticketServicePort": "3636",
      "ticketServiceVersion": "1.0.0.0",

      "ardsServiceHost": "ardsliteservice.104.131.67.21.xip.io",
      "ardsServicePort": "8831",
      "ardsServiceVersion": "1.0.0.0"





    }



};