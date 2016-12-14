var restify = require('restify');
var builder = require('botbuilder');
var Sensor = require('./sensor.js');
var sensor;
//var drbe = require('./packages/drbe/drbe.js');


//=========================================================
// Bot Setup
//=========================================================

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
server.post('/api/messages', connector.listen());

function processSensorData(req, res, next) {
    if (typeof sensor === "undefined") {
        sensor = new Sensor();
    }
    var intHeartRate = parseInt(req.params.heartrate);
    sensor.addHeartRate(intHeartRate);
    console.log("got last heart rate " + sensor.getLastHeartRate());
    res.send('Got heartRate value ' + sensor.getLastHeartRate());
    next();
}

//read sensor data
server.get('/sensor', processSensorData);

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
                session.replaceDialog('/Health');
                break;
            case emergencies[1]:
                session.send(emergencies[1]);
                break;
            case emergencies[2]:
                session.send(emergencies[2]);
                break;
            default:
                //no default case required as the framework handles invalid inputs
                //and prompts the user to enter a valid input
        }
    }
]);

//health conversation
bot.dialog('/Health', [
    function(session) {
        builder.Prompts.text(session, "What type of pain are you experiencing");
    },
    //figure out the type of emergency. Later use LUIS to get the emergency
    function(session, results) {
        if (results.response.includes("chest")) {
            session.userData.painType = "Chest Pain";
            builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
        } else {
            builder.Prompts.text(session, "I can only help diagnosing chestpain & headache");
        }
    },
    function(session, results) {
        session.userData.painLevel = results.response.entity;
        switch (session.userData.painLevel) {
            case "Mild":
            case "Sharp":
                //retrieve heartrate
                if (typeof sensor === "undefined") {
                  session.send("Unable to fetch heartrate");
                }else{
                  session.send("Your current heartrate is " + sensor.getLastHeartRate());
                }
                break;
            case "Severe":
                builder.Prompts.text(session, "Connecting to a Professional");
                break;
            default:
                //no default case required as the framework handles invalid inputs
                //and prompts the user to enter a valid input
        }
    }
]);
