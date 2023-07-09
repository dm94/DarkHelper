require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  InteractionType,
  Partials,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const genericCommands = require("./commands/generic");
const slashCommandsRegister = require("./slashCommandsRegister");
const logger = require("./helpers/logger");

const autocompleteController = require("./commands/interaction_types/autocomplete");
const buttonController = require("./commands/interaction_types/button");
const commandController = require("./commands/interaction_types/command");
const modalController = require("./commands/interaction_types/modal");
const tensorCommands = require("./commands/tensor");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.on("ready", () => {
  logger.info(`Logged in as ${client.user.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);

client.on("ready", () => {
  if (process.env.APP_DEV) {
    logger.info("Dev Mode");
    client.guilds.cache.forEach((guild) => {
      slashCommandsRegister.registerSlashCommands(guild.id);
    });
    console.log("Servers:" + client.guilds.cache.size);
  } else {
    slashCommandsRegister.registerSlashCommandsGlobal();
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.customId.includes("editAnswer")) {
      await modalController.router(interaction, client);
    } else if (
      interaction.type === InteractionType.ApplicationCommandAutocomplete
    ) {
      await autocompleteController.router(interaction);
    } else if (interaction.isButton()) {
      await buttonController.router(interaction);
    } else if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.commandName === "help") {
        await interaction.reply(
          genericCommands.getHelpContent(slashCommandsRegister.getCommands())
        );
      } else if (interaction.commandName === "trainm") {
        await modalController.router(interaction, client);
      } else {
        await commandController.router(interaction, client);
      }
    } else if (interaction.isModalSubmit()) {
      await modalController.router(interaction, client);
    }
  } catch (e) {
    logger.error(e);
  }
});

client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot) {
      return;
    }

    if (msg.content) {
      const editButton = new ButtonBuilder()
        .setCustomId("editAnswer")
        .setLabel("Edit answer")
        .setStyle(ButtonStyle.Danger);
      let response = await tensorCommands.answerMessage(msg.content, "en");
      if (!response) {
        response = await tensorCommands.answerMessage(msg.content, "es");
        editButton.setLabel("Corregir respuesta");
        editButton.setCustomId("editAnswerEs");
      }

      if (response) {
        const row = new ActionRowBuilder().addComponents(editButton);
        msg.reply({
          content: response,
          components: [row],
        });
      }
    }
  } catch (e) {
    logger.error(e);
  }
});
