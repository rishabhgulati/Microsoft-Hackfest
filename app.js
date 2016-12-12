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

bot.dialog('/', [
    function(session) {
        builder.Prompts.text(session, "Hello... What type of pain are you having?");
    },
    function(session, results) {
        //todo: trigger LUIS to and trigger the dialog based on that
        if (results.response.includes("chest")) {
            session.userData.pain = "Chest Pain";
            builder.Prompts.choice(session, "How severe?", ["Mild", "Sharp", "Severe"]);
        } else {
            builder.Prompts.text(session, "I don't know about this. Sorry");
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
    }
]);
