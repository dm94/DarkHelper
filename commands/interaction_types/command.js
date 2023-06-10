
const genericCommands = require("../generic");
const logger = require("../../helpers/logger");

const controller = {};

controller.router = async (interaction, client) => {
  try {
    if (interaction.commandName === "info") {
      await interaction.reply({ embeds: [genericCommands.getInfoContent()] });
    }
  } catch (e) {
    console.log(e);
    logger.error(e);
  }
};

controller.hasPermissions = async (interaction) => {
  return interaction.member.permissions.has("ADMINISTRATOR");
};

module.exports = controller;
