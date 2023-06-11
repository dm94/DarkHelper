const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("train")
    .setDescription(
      "Train the bot by adding questions and answers. (Only Admins)"
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
    )
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The question")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("answer").setDescription("The answer").setRequired(true)
    ),
};
