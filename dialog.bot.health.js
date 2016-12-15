var places = require('./places.js');
//health conversation
exports.healthBotDialog = function(bot, builder, bandDataHandler) {

    var dialog = bot.dialog('/Health', [
        function(session) {
            builder.Prompts.text(session, "What's your condition?");
        },
        //figure out the type of emergency. Later use LUIS to get the emergency
        function(session, results) {
            if (results.response.includes("chest")) {
                session.userData.painType = "chestpain";
                builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
            } else if (results.response.includes("headache")) {
                session.userData.painType = "headache";
                builder.Prompts.choice(session, "How severe is the pain?", ["Mild", "Sharp", "Severe"]);
            } else {
                builder.Prompts.text(session, "I can only help diagnosing chestpain & headache");
                session.endDialog();
            }
        },
        function(session, results) {
            session.userData.painLevel = results.response.entity;
            switch (session.userData.painLevel) {
                case "Mild":
                case "Sharp":
                    var heartRate = bandDataHandler.getLastHeartRate();
                    if (typeof heartRate === 'undefined' || heartRate == 0) {
                        session.send("Can't detect heart rate");
                        //suggest doctors/hospitals nearby
                        places.getPlaces(bandDataHandler.getLatitude(), bandDataHandler.getLongitude());
                        session.endDialog();
                        //TODO prompt question to user
                    } else {
                        if (heartRate > 60 && heartRate < 100) {
                            session.send("Heartrate seems to be normal");
                            //suggest doctors/hospitals nearby
                            places.getPlaces(bandDataHandler.getLatitude(), bandDataHandler.getLongitude());
                            session.endDialog();
                        } else {
                            session.send("Calling 911, heartrate abnormal " + heartRate);
                            session.endDialog();
                        }
                    }
                    break;
                case "Severe":
                    session.send("This could be a heart attack, Calling 911");
                    session.endDialog();
                    break;
                default:
                    //no default case required as the framework handles invalid inputs
                    //and prompts the user to enter a valid input
            }
        }
    ]);
    return dialog;
};
