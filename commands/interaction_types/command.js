const genericCommands = require("../generic");
const tensorCommands = require("../tensor");
const logger = require("../../helpers/logger");

const controller = {};

controller.router = async (interaction) => {
  try {
    if (interaction.commandName === "info") {
      await interaction
        .reply({ embeds: [genericCommands.getInfoContent()] })
        .catch((error) => {
          logger.error("Error replying to info command:", error);
        });
    } else if (
      interaction.commandName === "ask" ||
      interaction.commandName === "support"
    ) {
      await tensorCommands.answerTheQuestion(interaction);
    } else if (interaction.commandName === "train") {
      if (await controller.hasPermissions(interaction)) {
        await tensorCommands.addQuestion(interaction);
      } else {
        await interaction
          .reply("You do not have permissions to use this command")
          .catch((error) => {
            logger.error("Error replying to train command:", error);
          });
      }
    } else if (interaction.commandName === "donate") {
      await interaction.reply("https://ko-fi.com/deeme").catch((error) => {
        logger.error("Error replying to donate command:", error);
      });
    } else {
      await interaction.reply("I don't know this command").catch((error) => {
        logger.error("Error replying to unknown command:", error);
      });
    }
  } catch (e) {
    logger.error(e);
  }
};

controller.hasPermissions = async (interaction) => {
  return interaction.member.permissions.has("ADMINISTRATOR");
};

module.exports = controller;
