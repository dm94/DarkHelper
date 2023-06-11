const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Ask the bot what you need")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The question")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("language")
        .setDescription("Language")
        .addChoices(
          { name: "Spanish", value: "es" },
          { name: "English", value: "en" }
        )
        .setRequired(true)
    ),
};
