const tensorCommands = {};

const logger = require("../helpers/logger");
const othersFunctions = require("../helpers/others");

tensorCommands.answerTheQuestion = async (interaction) => {
  try {
    await interaction.deferReply({ ephemeral: false }).catch((error) => {
      logger.error("Error deferring reply:", error);
      throw error;
    });

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
      .catch((error) => {
        logger.error("Error editing reply:", error);
        throw error;
      });
  } catch (error) {
    logger.error("Error in answerTheQuestion:", error);
  }
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
  try {
    await interaction.deferReply({ ephemeral: true }).catch((error) => {
      logger.error("Error deferring reply in addAnswer:", error);
      throw error;
    });

    if (question.includes("@") || answer.includes("@")) {
      await interaction
        .editReply({
          content: "Questions and answers cannot contain @ mentions",
          ephemeral: true,
        })
        .catch((error) =>
          logger.error("Error replying about @ mentions:", error),
        );
      return;
    }

    let result = false;

    if (
      interaction?.member?.id &&
      interaction.member.id === process.env.DISCORD_OWNER_ID
    ) {
      result = await tensorCommands.addAnswerToDatabase({
        question: question,
        answer: answer,
        collection: "questions",
      });
    } else {
      result = await tensorCommands.addAnswerToDatabase({
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
        .catch((error) => logger.error("Error replying success:", error));
    } else {
      await interaction
        .editReply({
          content: "Error adding question",
          ephemeral: true,
        })
        .catch((error) => logger.error("Error replying failure:", error));
    }
  } catch (error) {
    logger.error("Error in addAnswer:", error);
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
