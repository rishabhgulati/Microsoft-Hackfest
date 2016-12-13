var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
var bot = new builder.UniversalBot(connector);
server.post('/api/messages', connector.listen());

//=========================================================
// Bots Dialogs
//=========================================================

var emergencies = ["Health", "Crime", "Catastrophe"];

bot.dialog('/', [
    //welcome the user, ask the emergency
    function(session) {
        session.send("Hello");
        builder.Prompts.choice(session, "What's the emergency?", emergencies);
    },
    //work with selected emergency
    function(session, results) {
        session.userData.emergency = results.response.entity;
        switch (session.userData.emergency) {
            case emergencies[0]:
                session.send(emergencies[0]);
                break;
            case emergencies[1]:
                session.send(emergencies[1]);
                break;
            case emergencies[2]:
                session.send(emergencies[2]);
                break;
            default:
                session.send("Unknown emergency selected");
                //TODO how to give choice again?
        }
    }
    //figure out the type of emergency. Later use LUIS to get the emergency
    /*function(session, results) {
        if (results.response.includes("chest")) {
            session.userData.pain = "Chest Pain";
            builder.Prompts.choice(session, "How severe?", ["Mild", "Sharp", "Severe"]);
        } else {
            builder.Prompts.text(session, "I can only help diagnosing chest pain & head ache");
        }
    },
    function(session, results) {
        session.userData.painLevel = results.response.entity;
        console.log("pain level " + session.userData.painLevel);
        switch (session.userData.painLevel) {
            case "Mild":
            case "Sharp":
                builder.Prompts.text(session, "Lets continue further");
                break;
            case "Severe":
                builder.Prompts.text(session, "Pain is severe, connecting to a Professional");
                break;
            default:
                builder.Prompts.text(session, "Unknown state");
        }
    }*/
]);
