var restify = require('restify');
var builder = require('botbuilder');
var bandDataHandler = require('./libs/msband2/bandDataHandler.js');
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
require("./dialog.health.js").healthDialog(bot, builder, bandDataHandler);

server.post('/api/messages', connector.listen());

var emergencies = ['Health', 'Crime', 'Search'];

//const LuisModelUrl = process.env.LUIS_URL;

//process microsoft band data
server.get('/sensor', bandDataHandler.processBandData);

//=========================================================
// Bots Dialogs
//=========================================================

bot.dialog('/', [
    function(session) {
        session.send("Hello, my name is Frida. I am an emergency bot.");
        // console.log('HeartRate ' + bandDataHandler.getLastHeartRate() + ', Latitude ' +
        //     bandDataHandler.getLatitude() + ', Longitude ' + bandDataHandler.getLongitude());
        builder.Prompts.choice(session, "What can I help you with?", emergencies);
    },
    function(session, results) {
        session.userData.emergency = results.response.entity;
        switch (session.userData.emergency) {
            case emergencies[0]:
                console.log(emergencies[0]);
                session.replaceDialog('/luis');
                break;
            case emergencies[1]:
                console.log(emergencies[1]);
                session.replaceDialog('/luis');
                break;
            case emergencies[2]:
                console.log(emergencies[2]);
                session.endConversation("Iggy Pop says: Search and Destroy!")
                break;
            default:
        }
    }
]);
