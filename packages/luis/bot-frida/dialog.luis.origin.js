exports.luis = function(builder){

    // Main dialog with LUIS
    var LuisModeUrl = /*process.env.LUIS_URL ||*/'https://iswudev.azure-api.net/luis/v2.0/apps/c4af3be6-61b2-4c02-8b12-6a1f7f10eec8?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true';
    var recognizer = new builder.LuisRecognizer(LuisModeUrl);
    //var recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/98eead94-8470-4337-9280-5bb7d5fb8502?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
    //var recognizer = new builder.LuisRecognizer('https://iswudev.azure-api.net/luis/v2.0/apps/8b5b16e1-6cdb-4b1c-ac30-62c4d499c6cd?subscription-key=c2cd164e833947fbb41ae9a3d9886a1f&verbose=true');
    var intents = new builder.IntentDialog({ recognizers: [recognizer] })
    .matches('sayHello', [
        function (session, args, next){
          session.send("(\'sayHello\' activation)");
          session.send("Hello!");

          var fetchArgs = (args)? args : null;
          console.log(fetchArgs);
        }
    ])
    .matches('sendCall', [
        function (session, args, next) {

            var fetchArgs = (args)? args : null;
            console.log(fetchArgs);

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


            session.send('(\'sendCall\' activation: \'%s\'\n\n%s)', session.message.text,msg);
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


            session.send('(\'Diagnose\' activation: \'%s\'\n\n%s)', session.message.text,msg);
        }
    ])
    .onDefault((session) => {
        session.send('Sorry, I did not understand \'%s\'.', session.message.text);

        var fetchArgs = (args)? args : null;
        console.log(fetchArgs);
    });

    return intents;

}


