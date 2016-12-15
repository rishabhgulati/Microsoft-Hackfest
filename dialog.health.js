//health conversation

exports.healthDialog = function (bot, builder, bandDataHandler){

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
              cards[i] = new builder.HeroCard(session)
                  .title(result.name)
                  .text('Store and help protect your data. Get durable, highly available data storage across the globe and pay only for what you use.')
                  .images([
                      builder.CardImage.create(session, result.icon)
                  ])
                  .buttons([
                      builder.CardAction.openUrl(session, 'https://google.com/', 'Learn More')
                  ]);
          }

          var reply = new builder.Message(session)
              .attachmentLayout(builder.AttachmentLayout.carousel)
              .attachments(cards);

          session.send(reply);
      }
  }

  //var intents = require("./dialog.luis.origin.js").luis(builder);
  var intents = require("./packages/luis/bot-frida/dialog.luis.main.js").luis(bandDataHandler);
  bot.dialog('/',intents);

  var dialog = bot.dialog('/health', [
      function(session) {
          builder.Prompts.text(session, "What's your condition? (e.g., \"chestpain\", \"headache\")");
      },
      //figure out the type of emergency. Later use LUIS to get the emergency
      function(session, results) {
          if (results.response.includes("chest")) {
              session.userData.painType = "chestpain";
              builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
          }
          else if (results.response.includes("headache")) {
              session.userData.painType = "headache";
              builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
          } else {
              builder.Prompts.text(session, "I can only help diagnosing chestpain & headache");
          }
      },
      function(session, results) {
          session.userData.painLevel = results.response.entity;
          switch (session.userData.painLevel) {
              case "Mild":
                  session.send("Ping --> Mild case");
                  break;
              case "Sharp":
                  //retrieve heartrate
                  if (typeof sensor === "undefined") {
                    session.send("Unable to fetch heartrate");
                  } else {
                    session.send("Your current heartrate is " + sensor.getLastHeartRate());
                  }
                  break;
              case "Severe":
                  session.send("Ping --> severe case");

                  break;
              default:
                  session.replaceDialog("/");
                  //no default case required as the framework handles invalid inputs
                  //and prompts the user to enter a valid input
          }
      },
      function(session){

      }
  ]);

  return dialog;

};
