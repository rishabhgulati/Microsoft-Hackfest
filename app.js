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
session.replaceDialog('/start');    }

]);

bot.dialog('/start', [
    function(session) {

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


bot.dialog('/health', [
            (session) => {
                builder.Prompts.text(session, 'What is your current condition?');
            },
              function(session, results) {
                session.privateConversationData.condition = session.message.text;
                console.log("condition= " + session.message.text);

                // retrieve the userState from results.response
                // Store the value in a variable and in the private conversation data
                let userState = session.privateConversationData.userState = results.response;

                if (!userState) {
                    // if it's empty, the user didn't give us any information. exit conversation
                    session.endConversation("I didn't get a response. Exiting conversation.");
                } else {
                    // retrieve the intensity
                    builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
                }
            },
            (session, results) => {
                switch (results.response.entity) {
                    case "Mild":
                    case "Sharp":
                        console.log(bandDataHandler.getLatitude());
                        if (typeof bandDataHandler.getLatitude() === 'undefined' || typeof bandDataHandler.getLongitude() === 'undefined') {
                            session.send("Can't detect your current location");
                            session.endDialog();
                        } else {
                            session.sendTyping();
                            //suggest doctors/hospitals nearby
                            session.send("Here are some doctors near you");
                            places.getPlaces(bandDataHandler.getLatitude(), bandDataHandler.getLongitude(), function(data) {
                                getCards(data, session, bot, builder);
                            });
                            session.endDialog();
                        }
                        break;
                    case "Severe":
                        var heartRate = bandDataHandler.getLastHeartRate();
                        if (session.privateConversationData.condition.includes('chest') && heartRate != 0) {
                            if (heartRate > 80) {
                                session.send("Last Heart Rate detected " + heartRate + ". This could be an emergency, calling 911");
                                session.endDialog();
                            } else {
                                session.send("Your last Heart Rate (" + heartRate + ") seems normal. Take care.");
                                session.endDialog();
                            }
                        }else{
                          session.send("Unable to get current Heart Rate. This could be an emergency, calling 911");
                          session.endDialog();
                        }
                        break;
                    default:
                        //no default case required as the framework handles invalid inputs
                        //and prompts the user to enter a valid input
                    
                }
            }
            
        

]);

bot.dialog('/crime',[
    function(session) {
       builder.Prompts.text(session, "What crime situation do you want to report?");

    },
     function(session, results)
     {
                        console.log("situation= " + session.message.text);
                        session.replaceDialog('/luis');     }

]);


