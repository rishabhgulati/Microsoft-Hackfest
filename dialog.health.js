//health conversation
exports.healthDialog = function (bot, builder, bandDataHandler){
  var intents = require("./packages/luis/bot-frida/dialog.luis.main.js").luis(bot, bandDataHandler);
  bot.dialog('/luis',intents);  
};
