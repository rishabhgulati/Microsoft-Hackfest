var restify = require('restify'),
    builder = require('botbuilder'),
    Sensor = require('./sensor.js'),
    sensor, drbe = require('./packages/drbe/drbe.js');

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

//const LuisModelUrl = process.env.LUIS_URL;
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

bot.dialog('/', [

    function(session) {
        session.send("Hello");
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


