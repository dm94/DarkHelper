const tensorCommands = {};

const logger = require("../helpers/logger");
const othersFunctions = require("../helpers/others");

tensorCommands.answerTheQuestion = async (interaction) => {
  await interaction.deferReply({ ephemeral: false });

  const question = interaction.options
    .getString("question")
    .trim()
    .toLowerCase();

  const response = await tensorCommands.getAnAnswer(question);

  await interaction
    .editReply({
      content: response || "No answer",
      ephemeral: false,
    })
    .catch((error) => logger.error(error));
};

tensorCommands.getAnAnswer = async (message) => {
  const options = {
    method: "get",
    url: `${process.env.APP_API_URL}/ask`,
    params: {
      question: message,
    },
  };

  const response = await othersFunctions.apiRequest(options);

  if (response?.data?.reply) {
    return response?.data?.reply;
  }

  return undefined;
};

tensorCommands.addQuestion = async (interaction) => {
  const question = interaction.options
    .getString("question")
    .trim()
    .toLowerCase();

  const answer = interaction.options.getString("answer").trim().toLowerCase();

  addAnswer(interaction, question, answer);
};

tensorCommands.trainFromUsers = async (interaction) => {
  const question = interaction.fields
    .getTextInputValue("questionInput")
    .trim()
    .toLowerCase();
  const answer = interaction.fields
    .getTextInputValue("answerInput")
    .trim()
    .toLowerCase();

  addAnswer(interaction, question, answer);
};

const addAnswer = async (interaction, question, answer) => {
  await interaction.deferReply({ ephemeral: true });

  if (question.includes("@") || answer.includes("@")) {
    return;
  }

  let result = false;

  if (
    interaction?.member?.id &&
    interaction.member.id === process.env.DISCORD_OWNER_ID
  ) {
    result = tensorCommands.addAnswerToDatabase({
      question: question,
      answer: answer,
      collection: "questions",
    });
  } else {
    result = tensorCommands.addAnswerToDatabase({
      guilid: interaction?.member?.id ?? "",
      question: question,
      answer: answer,
      collection: "extraquestions",
    });
  }

  if (result) {
    await interaction
      .editReply({
        content: "Question added",
        ephemeral: true,
      })
      .catch((error) => logger.error(error));
  } else {
    await interaction
      .editReply({
        content: "Error adding question",
        ephemeral: true,
      })
      .catch((error) => logger.error(error));
  }
};

tensorCommands.addAnswerToDatabase = async (data) => {
  const options = {
    method: "post",
    url: `${process.env.APP_API_URL}/train`,
    data: data,
  };

  const result = await othersFunctions.apiRequest(options);

  return result.success;
};

module.exports = tensorCommands;
