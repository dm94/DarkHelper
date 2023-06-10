const genericCommands = {};

const { EmbedBuilder } = require("discord.js");
const pjson = require("../package.json");

genericCommands.getInfoContent = () => {
  const message = new EmbedBuilder()
    .setColor("#008FFF")
    .setTitle(pjson.name + " v" + pjson.version)
    .setURL("https://github.com/dm94/lastoasisbot")
    .setAuthor({
      name: pjson.author,
      iconURL: "https://avatars.githubusercontent.com/u/7419213",
      url: "https://github.com/dm94",
    })
    .setDescription(
      pjson.description);
  return message;
};

genericCommands.getHelpContent = (commands) => {
  let text =
    "Now we work with slash commands type in chat / and you will start to see all the options \n \n";

  commands.forEach((command) => {
    if (command.name && command.description) {
      text += `**/${command.name}** = ${command.description} \n`;
    }
  });

  return text;
};

module.exports = genericCommands;
