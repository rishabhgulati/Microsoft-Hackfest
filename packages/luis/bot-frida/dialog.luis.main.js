"use strict"
const builder = require('botbuilder');
var places = require('./../../../libs/places/places.js');
var Bing = require('node-bing-api')({
    accKey: process.env.BING_SEARCH
});

const LuisModeUrl = /*process.env.LUIS_URL ||*/ 'https://api.projectoxford.ai/luis/v2.0/apps/2ab59482-62dd-46e8-80bf-2ac84db9bc0f?subscription-key=599a72b405e94b6db97dad223160c7c9&verbose=true';
const recognizer = new builder.LuisRecognizer(LuisModeUrl);
//const recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/98eead94-8470-4337-9280-5bb7d5fb8502?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
//const recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/8b5b16e1-6cdb-4b1c-ac30-62c4d499c6cd?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');

//parse google places api response to create cards, where data is a JSON object
var getCards = function(data, session, bot, builder) {
    var noOfResults = data.results.length;

    if (noOfResults == 0) {
        console.log("no results available");
        return null;
    } else {
        //show a maximum of 3 cards
        var noOfCards = (noOfResults < 3) ? noOfResults : 3;
        var cards = [];
        for (var i = 0; i < noOfCards; i++) {
            var result = data.results[i];
            console.log("name " + result.name + ", vicinity " + result.vicinity);
            cards[i] = new builder.HeroCard(session)
                .title(result.name)
                .subtitle(result.vicinity)
                //.text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
                .images([
                    //builder.CardImage.create(session, result.icon)

                    //currently hardcoding the icon image for displaying
                    builder.CardImage.create(session, 'http://image.flaticon.com/icons/svg/194/194916.svg')
                ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://google.com/', 'Book Appointment')
                ]);
        }

        var reply = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);

        session.send(reply);
    }
}

exports.luis = function(bot, bandDataHandler) {
    var intents = new builder.IntentDialog({
            recognizers: [recognizer]
        })
        .matches('assess', [
            (session, args, next) => {
                var fetchArgs = (args) ? args : null;
                console.log(fetchArgs);

                session.privateConversationData.args = args;
                let userState = session.privateConversationData.userState = builder.EntityRecognizer.findEntity(args.entities, 'UserState');
                if (userState) {
                    next({
                        response: userState
                    });
                } else {
                    builder.Prompts.text(session, 'What is your current condition?');
                }
            },
            (session, results) => {
                console.log("condition= " + session.message.text);
                session.privateConversationData.condition = session.message.text;
                // retrieve the userState from results.response
                // Store the value in a variable and in the private conversation data
                let userState = session.privateConversationData.userState = results.response;

                if (!userState) {
                    // if it's empty, the user didn't give us any information. exit conversation
                    session.endConversation("I didn't get a response. Exiting conversation.");
                } else {
                    // retrieve the intensity
                    //builder.Prompts.number(session, 'What is the intensity on a scale of 1-10, with 10 being worst.');
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
        ])
//New Waterfall Sprint6
        .matches('CrimeReport', [
            (session, args, next) => {
         // session.endConversation("Poor guy!");
            var fetchArgs = (args) ? args : null;
                console.log(fetchArgs);
                session.privateConversationData.args = args;
                let name = session.privateConversationData.userState = builder.EntityRecognizer.findEntity(args.entities, 'name');
                if (name) {
                    next({
                        response: name
                    });
                } else {
                    // ask about the name
                    builder.Prompts.text(session, "What is your name sir?");
                }
            },
             (session, results) => {
                 // retrieve the name from results.response
                // Store the value in a variable and in the private conversation data
                console.log("name= " + session.message.text);
                session.privateConversationData.name = session.message.text;
                let name = session.privateConversationData.name = results.response
                if (!name) {
                    // if name is empty, the user didn't give us the name, anonymous calls are not accepted, exit conversation
                    session.endConversation("I didn't get a response. Exiting conversation.");
                } else {
                builder.Prompts.choice(session, "Are you in immediate danger, "+ name +"?", ["Y", "N"]);
                }
             },
             (session, results) => {
                switch (results.response.entity) {
                    case "Y":
                        console.log(bandDataHandler.getLatitude());
                        if (typeof bandDataHandler.getLatitude() === 'undefined' || typeof bandDataHandler.getLongitude() === 'undefined') {
                            session.send("Can't detect your current location, I'm afraid I won't be able to help you this time");
                            session.endDialog();
                        } else {
                            session.sendTyping();
                            //suggest doctors/hospitals nearby
                            session.send("I got your GPS reading sir, a patrol car is heading your way");
                            places.getPlaces(bandDataHandler.getLatitude(), bandDataHandler.getLongitude(), function(data) {
                                getCards(data, session, bot, builder);
                            });
                            session.endDialog();
                        }
                        session.endConversation("Have a good day, " + session.privateConversationData.name +"");
                        break;
                    case "N":
                        // builder.Prompts.text(session, "What situation do you want to report?")
                        bot.add('/', new builder.IntentDialog('model')
                        .onDefault('/extensions'));
                        bot.add('/extensions', new builder.IntentDialog('extension model')
                        .on('extension model', function (session) {
                        builder.Prompts.choice(session, "What situation do you want to report?");
                        console.log("situation= " + session.message.text);
                        session.privateConversationData.situation = session.message.text;
                        let  situation = session.privateConversationData.situation = results.response
                            intents.matches ('StolenGoodsReport', [

                                (session, args, next) => {
                                var fetchArgs = (args) ? args : null;
                                console.log(fetchArgs);
                                session.privateConversationData.args = args;
                                session.send("What kind of goods have been stolen?"); 
                                session.endDialog()
                                }
                        ])
                        intents.matches ('AssaultReport', [
                             (session, args, next) => {
                            var fetchArgs = (args) ? args : null;
                            console.log(fetchArgs),
                            session.send("Ok."),
                            session.endDialog()
                             }
                        ])    

                        session.endConversation("Have a good day, " + session.privateConversationData.name +"")}))
                }
             }
                        ])

                    

        .matches('search', [
            (session, args, next) => {
                session.send("(\'search\' activation)");
                Bing.composite(JSON.stringify(session.message.text), {
                    top: 5
                }, (error, res, body) => {
                    session.send("Here are some search results for " + JSON.stringify(session.message.text) + ": %s", JSON.stringify(body.news));
                })
            }
        ])
        .onDefault([
            (session, args, next) => {
                var fetchArgs = (args) ? args : null;
                console.log(fetchArgs);

                session.endConversation("Triggered \'onDefault\' -- Done");
            }
        ]);

    return intents;
}
