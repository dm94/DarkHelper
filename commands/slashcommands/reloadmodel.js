const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("Reload the IA model. (Only Admins)"),
};
