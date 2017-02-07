/**
 * Created by Sukitha on 11/25/2016.
 */
var config = require('config');
var smpp = require('smpp');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;

var smpphost = config.SMPPClient.ip;
var smppport = config.SMPPClient.port;
var didConnect = false;


var session = new smpp.Session({host: smpphost, port: smppport});

session.on('connect', function(){

    var username = config.SMPPClient.user;
    var password = config.SMPPClient.password;
    didConnect = true;



    session.bind_transceiver({
        system_id: username,
        password: password,
        interface_version: 1,
        system_type: '380666000600',
        address_range: '+380666000600',
        addr_ton: 1,
        addr_npi: 1,
    }, function(pdu) {
        console.log('pdu status', lookupPDUStatusKey(pdu.command_status));
        if (pdu.command_status == 0) {
            console.log('Successfully bound')
        }
    });
});




session.on('close', function(){
    console.log('smpp disconnected')
    if (didConnect) {
        connectSMPP();
    }
});



session.on('error', function(error){
    console.log('smpp error', error)
    didConnect = true;
    //process.exit(1);
});


function lookupPDUStatusKey(pduCommandStatus) {
    for (var k in smpp.errors) {
        if (smpp.errors[k] == pduCommandStatus) {
            return k
        }
    }
};

function connectSMPP() {
    console.log('smpp reconnecting');
    session.connect();
}

var sendSMPP = function(from, to, text, cb) {



    from = from.toString();
    to   = to.toString();

    session.submit_sm({
        source_addr:      from,
        destination_addr: to,
        short_message:    text
    }, function(pdu) {
        console.log('sms pdu status', lookupPDUStatusKey(pdu.command_status));
        if (pdu.command_status == 0) {
            // Message successfully sent
            console.log(pdu.message_id);
            cb(true, pdu.message_id)
        }else{

            cb(false)
        }
    });
}


session.on('pdu', function(pdu){

    // incoming SMS from SMSC
    console.log(pdu);
    if (pdu.command == 'deliver_sm') {

        // no '+' here
        var fromNumber = pdu.source_addr.toString();
        var toNumber = pdu.destination_addr.toString();

        var text = '';
        if (pdu.short_message && pdu.short_message.message) {
            text = pdu.short_message.message;
        }

        console.log('SMS ' + from + ' -> ' + to + ': ' + text);

        // Reply to SMSC that we received and processed the SMS
        session.deliver_sm_resp({ sequence_number: pdu.sequence_number });
    }
})


module.exports.SendSMPP = sendSMPP;
