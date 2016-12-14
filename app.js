var restify = require('restify')
,   builder = require('botbuilder')
,   Sensor = require('./sensor.js')
,   sensor
,   drbe = require('./packages/drbe/drbe.js');

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

// Main dialog with LUIS
//var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/98eead94-8470-4337-9280-5bb7d5fb8502?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
    .matches('sendCall', [
        function (session, args, next) {

            var contact = builder.EntityRecognizer.findEntity(args.entities, 'emergency contact');
            var name = builder.EntityRecognizer.findEntity(args.entities, 'name');
            var encyclopedia = builder.EntityRecognizer.findEntity(args.entities, 'encyclopedia');

            var msg = "";

            if (contact) {
                msg += "I think your contact is: "+contact.entity+"\n";
            }
            if (name) {
                msg += "I think your name is: "+name.entity+"\n";
            }
            if (encyclopedia) {
                msg += "I think your encyclopedia is: "+encyclopedia.entity+"\n";
            }


            session.send('sendCall triggered: \'%s\'\n\n%s', session.message.text,msg);
        }
    ])
    .matches('diagnose', [
        function (session, args, next) {

            // try extracting entities
            var intensity = builder.EntityRecognizer.findEntity(args.entities, 'intensity');
            var contact = builder.EntityRecognizer.findEntity(args.entities, 'emergency contact');
            var location = builder.EntityRecognizer.findEntity(args.entities, 'location');


            session.privateConversationData = args;
            builder.Prompts.choice(session, "Hi. What is the reason for your call?", ["Health Emergency", "Crime Report", "Catastrophe"]);

            var msg = "";

            if (intensity) {
                msg += "I think your intensity is: "+intensity.entity+"\n";
            }
            if (contact) {
                msg += "I think your contact is: "+contact.entity+"\n";
            }
            if (location) {
                msg += "I think your location is: "+location.entity+"\n";
            }


            session.send('diagnos triggered: \'%s\'\n\n%s', session.message.text,msg);
        }
    ])
    .onDefault((session) => {
        session.send('Sorry, I did not understand \'%s\'.', session.message.text);
    });

bot.dialog('/', intents);


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
