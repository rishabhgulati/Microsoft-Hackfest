"use strict"
const builder = require('botbuilder');
var places = require('./../../../libs/places/places.js');
var Bing = require('node-bing-api')({
    accKey: process.env.BING_SEARCH
});


const LuisModeUrl = /*process.env.LUIS_URL ||*/ 'https://iswudev.azure-api.net/luis/v2.0/apps/c4af3be6-61b2-4c02-8b12-6a1f7f10eec8?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true';
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
                    builder.CardImage.create(session, 'http://icons.iconarchive.com/icons/bevel-and-emboss/character/256/doctor-icon.png')
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
        .matches('diagnose', [
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
                            session.send("Can't detect lat/lng");
                            session.endDialog();
                        } else {
                            session.sendTyping();
                            //suggest doctors/hospitals nearby
                            places.getPlaces(bandDataHandler.getLatitude(), bandDataHandler.getLongitude(), function(data) {
                                getCards(data, session, bot, builder);
                            });
                            session.endDialog();
                        }
                        break;
                    case "Severe":
                        session.send("This could be a heart attack,Calling 911");
                        session.endDialog();
                        break;
                    default:
                        //no default case required as the framework handles invalid inputs
                        //and prompts the user to enter a valid input
                }
            },
            (session, results) => {
                let location = results.response;
                if (location === 'Pittsburgh') {
                    session.endConversation("I'm going to call your wife.");
                } else {
                    session.endConversation("I'm going to call an ambulance");
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
