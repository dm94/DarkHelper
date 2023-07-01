const genericCommands = require("../generic");
const tensorCommands = require("../tensor");
const logger = require("../../helpers/logger");

const controller = {};

controller.router = async (interaction) => {
  try {
    if (interaction.commandName === "info") {
      await interaction.reply({ embeds: [genericCommands.getInfoContent()] });
    } else if (
      interaction.commandName === "ask" ||
      interaction.commandName === "support"
    ) {
      await tensorCommands.answerTheQuestion(interaction);
    } else if (interaction.commandName === "train") {
      if (await controller.hasPermissions(interaction)) {
        await tensorCommands.addQuestion(interaction);
      } else {
        await interaction.reply(
          "You do not have permissions to use this command"
        );
      }
    } else if (interaction.commandName === "reload") {
      if (
        interaction?.member?.id &&
        interaction.member.id === process.env.DISCORD_OWNER_ID
      ) {
        await tensorCommands.reloadModel(interaction);
      } else {
        await interaction.reply(
          "You do not have permissions to use this command"
        );
      }
    } else {
      await interaction.reply("I don't know this command");
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
