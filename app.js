var restify = require('restify');
var builder = require('botbuilder');
var bandDataHandler = require('./BandDataHandler.js');
//var drbe = require('./packages/drbe/drbe.js');

// Setup Restify Server
var server = restify.createServer();
server.use(restify.queryParser());
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);

//non luis simple health waterfall
//require("./dialog.bot.health.js").healthBotDialog(bot, builder, bandDataHandler);

//health dialog with luis integration
//require("./dialog.health.js").healthDialog(bot, builder, process);
require("./dialog.health.js").healthDialog(bot, builder, process);

server.post('/api/messages', connector.listen());

var emergencies = ['Health', 'Crime', 'Catastrophe'];

//const LuisModelUrl = process.env.LUIS_URL;

//process microsoft band data
server.get('/sensor', bandDataHandler.processBandData);

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/HealthWF', [

    function(session) {
        session.send("Hello. I am an emergency bot.");
        console.log('HeartRate ' + bandDataHandler.getLastHeartRate() + ', Latitude ' +
            bandDataHandler.getLatitude() + ', Longitude ' + bandDataHandler.getLongitude());

        builder.Prompts.choice(session, "What's the emergency?", emergencies);
    },

    function(session, results) {
        session.userData.emergency = results.response.entity;
        switch (session.userData.emergency) {
            case emergencies[0]:
                session.send(emergencies[0]);
                session.replaceDialog('/Health');
                break;
            case emergencies[1]:
                session.send(emergencies[1]);
                break;
            case emergencies[2]:
                session.send(emergencies[2]);
                break;
            default:
        }
    }
]);
