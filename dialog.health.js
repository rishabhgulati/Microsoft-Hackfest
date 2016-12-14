
//health conversation

exports.healthDialog = function (bot, builder){

  var dialog = bot.dialog('/Health', [
      function(session) {
          builder.Prompts.text(session, "What's your condition?");
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
              case "Sharp":
                  //retrieve heartrate
                  if (typeof sensor === "undefined") {
                    session.send("Unable to fetch heartrate");
                  } else {
                    session.send("Your current heartrate is " + sensor.getLastHeartRate());
                  }
                  break;
              case "Severe":
                  builder.Prompts.text(session, "Connecting to a Professional");
                  break;
              default:
                  session.replaceDialog("/");
                  //no default case required as the framework handles invalid inputs
                  //and prompts the user to enter a valid input
          }
      }
  ]);

  return dialog;

};



