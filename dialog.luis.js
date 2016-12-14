exports.luis = function(builder){

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

    return intents;

}


