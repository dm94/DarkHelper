const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("trainm")
    .setDescription(
      "Train the bot by adding questions and answers. (Modal) (Only Admins)"
    ),
};
