const genericCommands = {};

const { EmbedBuilder } = require("discord.js");
const pjson = require("../package.json");

genericCommands.getInfoContent = () => {
  const message = new EmbedBuilder()
    .setColor("#008FFF")
    .setTitle(`${pjson.name} v${pjson.version}`)
    .setURL(pjson.repository.url)
    .setAuthor({
      name: pjson.author,
      iconURL: "https://avatars.githubusercontent.com/u/7419213",
      url: "https://github.com/dm94",
    })
    .setDescription(pjson.description);
  return message;
};

genericCommands.getHelpContent = (commands) => {
  let text = "Commands: \n \n";

  for (const command of commands) {
    if (command.name && command.description) {
      text += `**/${command.name}** = ${command.description} \n`;
    }
  }

  return text;
};

module.exports = genericCommands;
