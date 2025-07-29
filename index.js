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
  ChannelType,
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

    for (const guild of client.guilds.cache) {
      slashCommandsRegister.registerSlashCommands(guild.id);
    }

    console.log(`Servers:${client.guilds.cache.size}`);
  } else {
    slashCommandsRegister.registerSlashCommandsGlobal();
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction?.customId?.includes("editAnswer")) {
      await modalController.router(interaction, client);
    } else if (
      interaction.type === InteractionType.ApplicationCommandAutocomplete
    ) {
      await autocompleteController.router(interaction);
    } else if (interaction.isButton()) {
      await buttonController.router(interaction);
    } else if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.commandName === "help") {
        await interaction
          .reply(
            genericCommands.getHelpContent(slashCommandsRegister.getCommands()),
          )
          .catch((error) => {
            logger.error("Error replying to help command:", error);
          });
      } else if (interaction.commandName === "trainm") {
        await modalController.router(interaction, client);
      } else {
        await commandController.router(interaction, client);
      }
    } else if (interaction.isModalSubmit()) {
      await modalController.router(interaction, client);
    }
  } catch (e) {
    logger.error("Error in interactionCreate:", e);
  }
});

client.on("threadCreate", async (thread) => {
  if (thread.type !== ChannelType.PublicThread) {
    return;
  }

  try {
    const message = await thread?.fetchStarterMessage();
    if (message) {
      messageEvent(message, true);
    }
  } catch {
    logger.error("Error fetching thread");
  }
});

client.on("messageCreate", async (msg) => await messageEvent(msg));

const messageEvent = async (msg, forceResponse = false) => {
  try {
    if (msg?.author?.bot || !msg?.content) {
      return;
    }

    if (msg?.type === MessageType.Reply) {
      selfTrain(msg);
      return;
    }

    if (msg?.mentions?.users?.size > 0) {
      return;
    }

    if (!msg.content?.includes("?") && !forceResponse) {
      return;
    }

    const editButton = new ButtonBuilder()
      .setCustomId("editAnswer")
      .setLabel("Fix answer")
      .setStyle(ButtonStyle.Danger);

    const response = await tensorCommands.getAnAnswer(msg.content);
    if (response) {
      const row = new ActionRowBuilder().addComponents(editButton);
      msg
        .reply({
          content: response,
          components: [row],
        })
        .catch((error) => {
          logger.error("Error sending reply:", error);
        });
    }
  } catch (e) {
    logger.error(e);
  }
};

const selfTrain = async (msg) => {
  const answer = msg?.content;

  if (!answer) {
    return;
  }

  const messageReferenceId = msg?.reference?.messageId;

  if (!messageReferenceId) {
    return;
  }

  const question = await msg.channel.messages.fetch(messageReferenceId);

  if (!question) {
    return;
  }

  await tensorCommands.addAnswerToDatabase({
    guilid: msg?.author?.id ?? "",
    collection: "extraquestions",
    question: question.content,
    answer: answer,
  });
};
