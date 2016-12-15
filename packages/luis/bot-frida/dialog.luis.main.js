"use strict"
const builder = require('botbuilder');
var Bing = require('node-bing-api')({accKey: process.env.BING_SEARCH});

const LuisModeUrl = /*process.env.LUIS_URL ||*/'https://iswudev.azure-api.net/luis/v2.0/apps/c4af3be6-61b2-4c02-8b12-6a1f7f10eec8?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true';
const recognizer = new builder.LuisRecognizer(LuisModeUrl);
//const recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/98eead94-8470-4337-9280-5bb7d5fb8502?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
//const recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/8b5b16e1-6cdb-4b1c-ac30-62c4d499c6cd?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
module.exports = new builder.IntentDialog({ recognizers: [recognizer] })
    .matches('diagnose', [
        (session, args, next) => {
            var fetchArgs = (args)? args : null;
            console.log(fetchArgs);

            session.privateConversationData.args = args;
            let userState = session.privateConversationData.userState = builder.EntityRecognizer.findEntity(args.entities, 'UserState');
            if (userState) {
                next({ response: userState });
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
                builder.Prompts.number(session, 'What is the intensity on a scale of 1-10, with 10 being worst.');
            }
        },
        (session, results) => {
            let intensity = results.response;
            if(!intensity) {
                // no value provided. exit
                session.endConversation("I didn't receive a response");
            } else if(intensity == 'high') {
                // determine location
                builder.Prompts.text(session, 'What is your location?');
                //fetch GPS location?
            } else if((intensity == 'low') || (intensity == 'med')) {
                session.endConversation("(Severity --> low/med) You're not dead yet. (keyword: yet)");
            } else {
                session.endConversation("You're not dead yet. (keyword: yet)");
            }
        },
        (session, results) => {
            let location = results.response;
            if(location === 'Pittsburgh') {
                session.endConversation("I'm going to call your wife.");
            } else {
                session.endConversation("I'm going to call an ambulance");
            }
        }
    ])
    .matches('search',[
      (session, args, next) => {
        session.send("(\'search\' activation)");
        Bing.composite(JSON.stringify(session.message.text), {
          top: 5
        }, (error, res, body) => {
          session.send("Here are some search results for "+JSON.stringify(session.message.text)+": %s", JSON.stringify(body.news));
        })
      }
    ])
    .onDefault([
      (session, args, next) => {
        var fetchArgs = (args)? args : null;
        console.log(fetchArgs);

        session.endConversation("Triggered \'onDefault\' -- Done");
      }
    ]);
