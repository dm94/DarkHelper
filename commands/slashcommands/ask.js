const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Ask the bot what you need")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The question")
        .setRequired(true),
    ),
};
