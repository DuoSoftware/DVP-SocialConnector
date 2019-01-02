module.exports = {




    "DB": {
        "Type": "postgres",
        "User": "",
        "Password": "",
        "Port": 5432,
        "Host": "",
        "Database": ""
    },


    "Redis":
        {
            "mode":"sentinel",//instance, cluster, sentinel
            "ip": "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
                "port":16389,
                "name":"redis-cluster"
            }

        },


    "Security":
        {

            "ip" : "45.55.142.207",
            "port": 6389,
            "user": "duo",
            "password": "DuoS123",
            "mode":"sentinel",//instance, cluster, sentinel
            "sentinels":{
                "hosts": "138.197.90.92,45.55.205.92,138.197.90.92",
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
            "port": "4646",
            'twitterQueueName': "TWEETOUT",
            'facebookQueueName': "FACEBOOKOUT",
            "version": "1.0.0.0"
        },


    "LBServer" : {

        "ip": "104.236.197.119",
        "port": "4647"

    },


    "Mongo":
        {
            "ip":"104.236.231.11",
            "port":"27017",
            "dbname":"dvpdb",
            "password":"DuoS123",
            "user":"duo",
            "replicaset" :"104.236.231.11"
        },



    "RabbitMQ":
        {
            "ip": "45.55.142.207",
            "port": 5672,
            "user": "admin",
            "password": "admin",
            "vhost":'/'
        },


    "Services": {
        "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdWtpdGhhIiwianRpIjoiYWEzOGRmZWYtNDFhOC00MWUyLTgwMzktOTJjZTY0YjM4ZDFmIiwic3ViIjoiNTZhOWU3NTlmYjA3MTkwN2EwMDAwMDAxMjVkOWU4MGI1YzdjNGY5ODQ2NmY5MjExNzk2ZWJmNDMiLCJleHAiOjE5MDIzODExMTgsInRlbmFudCI6LTEsImNvbXBhbnkiOi0xLCJzY29wZSI6W3sicmVzb3VyY2UiOiJhbGwiLCJhY3Rpb25zIjoiYWxsIn1dLCJpYXQiOjE0NzAzODExMTh9.Gmlu00Uj66Fzts-w6qEwNUz46XYGzE8wHUhAJOFtiRo",

        "resourceServiceHost": "",
        "resourceServicePort": "8831",
        "resourceServiceVersion": "1.0.0.0",


        "interactionport": '3637',
        "interactionversion": "1.0",

        "ticketServiceHost": "liteticket.app1.veery.cloud",
        "ticketServicePort": "3636",
        "ticketServiceVersion": "1.0.0.0",




        "cronurl": "",//scheduleworker.app.veery.cloud
        "cronport": '8080',
        "cronversion": "1.0.0.0",


        "ardsServiceHost": "",
        "ardsServicePort": "8831",
        "ardsServiceVersion": "1.0.0.0",

        "facebookUrl": "https://graph.facebook.com/v2.8/",

        "ruleserviceurl": "",
        "ruleserviceport": "8888",
        "ruleserviceversion": "1.0.0.0",

        "fileServiceHost": "",
        "fileServicePort": 5645,
        "fileServiceVersion": "1.0.0.0",

        "twitterCallbackHost": "",
        "twitterCallbackPort": "",
        "twitterCallbackVersion": ""

    },

    "SocialConnector": {
        "fb_client_id": "",
        "fb_client_secret": "",
        "owner_id": ""
    },


    "TwitterConnector": {
        //account_activity/all/:env_name/webhooks
        "Consumer_Key":"",
        "Consumer_Secret": "",
        "environment": "development",
        "callbackURL": ""
    }

};
