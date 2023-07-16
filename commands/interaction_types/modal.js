const tensorCommands = require("../tensor");
const logger = require("../../helpers/logger");
const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

const controller = {};

controller.router = async (interaction) => {
  try {
    if (
      (interaction.commandName === "trainm" &&
        interaction.member.id === process.env.DISCORD_OWNER_ID) ||
      interaction.customId === "editAnswer"
    ) {
      await controller.showTrainModal(interaction, "trainmodal");
    } else if (interaction.customId === "trainmodal") {
      await tensorCommands.trainFromUsers(interaction);
    }
  } catch (e) {
    console.log(e);
    logger.error(e);
  }
};

controller.showTrainModal = async (interaction, customId = "trainmodal") => {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle("Train Modal");

  const questionInput = new TextInputBuilder()
    .setCustomId("questionInput")
    .setLabel("Question")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const answerInput = new TextInputBuilder()
    .setCustomId("answerInput")
    .setLabel("Answer")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(questionInput);
  const secondActionRow = new ActionRowBuilder().addComponents(answerInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
};

controller.hasPermissions = async (interaction) => {
  return interaction.member.permissions.has("ADMINISTRATOR");
};

module.exports = controller;
