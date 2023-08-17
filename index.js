require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  InteractionType,
  Partials,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageType,
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
    if (interaction?.customId && interaction.customId.includes("editAnswer")) {
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
    console.log(e);

    logger.error(e);
  }
});

client.on("messageCreate", async (msg) => {
  try {
    if (msg.author.bot || msg.mentions.users.size > 0) {
      return;
    }

    if (msg.type === MessageType.Reply) {
      selfTrain(msg);
      return;
    }

    if (msg.content) {
      const editButton = new ButtonBuilder()
        .setCustomId("editAnswer")
        .setLabel("Fix answer")
        .setStyle(ButtonStyle.Danger);
      const language = await tensorCommands.detectLanguage(msg.content);
      const response = await tensorCommands.getAnAnswer(msg.content, language);
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

const selfTrain = async (msg) => {
  const answer = msg.content;

  if (!answer) {
    return;
  }

  const language = await tensorCommands.detectLanguage(answer, "en");

  const messageReferenceId = msg?.reference?.messageId;

  console.log("messageReferenceId", messageReferenceId);

  if (!messageReferenceId) {
    return;
  }

  const question = await msg.channel.messages.fetch(messageReferenceId);

  console.log("question", question);

  if (!question) {
    return;
  }

  await tensorCommands.addAnswerToDatabase(
    {
      guilid: msg?.author?.id ?? "",
      language: language,
      question: question.content,
      answer: answer,
    },
    "extraquestions"
  );
};
