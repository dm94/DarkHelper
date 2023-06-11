const tensorCommands = {};

const { NlpManager } = require("node-nlp");
const { MongoClient, ServerApiVersion } = require("mongodb");
const logger = require("../helpers/logger");

const uri = process.env.MONGODB_CONNECTION;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const manager = new NlpManager({ languages: ["es", "en"] });
let modelLoaded = false;

async function getData() {
  let data = [];
  try {
    await client.connect();
    const collection = client.db("dark").collection("questions");
    data = await collection
      .find({}, { projection: { _id: 0, question: 1, answer: 1, language: 1 } })
      .toArray();
    const extraCollection = client.db("dark").collection("extraquestions");
    const extra = await extraCollection
        .find({}, { projection: { _id: 0, question: 1, answer: 1, language: 1 } })
        .toArray();
    data = data.concat(extra);
    console.info(new Date().toLocaleTimeString(), "Data: Loaded from DB");
  } finally {
    await client.close();
  }

  return data;
}

const addModel = async (trainingData) => {
  console.info(new Date().toLocaleTimeString(), "AI Logic: Model loading");
  try {
    trainingData.forEach((data) => {
      manager.addDocument(data.language ?? "es", data.question, data.answer);
    });
    await manager.train();
  } catch (error) {
    console.log(error);
    logger.error(error);
  }
  console.info(new Date().toLocaleTimeString(), "AI Logic: Model loaded");
};

const loadModel = async () => {
  modelLoaded = false;
  const data = await getData();
  await addModel(data);
  modelLoaded = true;
};

tensorCommands.reloadModel = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });

  await loadModel();

  await interaction
    .editReply({
      content: "Reloaded model",
      ephemeral: true,
    })
    .catch((error) => logger.error(error));
};

tensorCommands.answerTheQuestion = async (interaction) => {
  await interaction.deferReply({ ephemeral: false });

  if (!modelLoaded) {
    await loadModel();
  }

  const question = interaction.options
    .getString("question")
    .trim()
    .toLowerCase();

  console.info(`answerTheQuestion: ${question}`);

  const response = await manager.process("es", question);
  await interaction
    .editReply({
      content: response.answer || response.intent || "No answer",
      ephemeral: false,
    })
    .catch((error) => logger.error(error));
};

tensorCommands.addQuestion = async (interaction) => {
  await interaction.deferReply({ ephemeral: true });

  const question = interaction.options
    .getString("question")
    .trim()
    .toLowerCase();

  const answer = interaction.options.getString("answer").trim().toLowerCase();
  const language = interaction.options
    .getString("language")
    .trim()
    .toLowerCase();

  try {
    await client.connect();
    if (interaction?.member?.id && interaction.member.id === process.env.DISCORD_OWNER_ID) {
      const collection = client.db("dark").collection("questions");
      await collection.insertOne({
        language: language,
        question: question,
        answer: answer,
      });
      await interaction
        .editReply({
          content: "Question added",
          ephemeral: true,
        })
        .catch((error) => logger.error(error));
    } else {
      const collection = client.db("dark").collection("extraquestions");
      await collection.insertOne({
        language: language,
        question: question,
        answer: answer,
      });
      await interaction
        .editReply({
          content: "Extra Question added",
          ephemeral: true,
        })
        .catch((error) => logger.error(error));
    }
  } catch (err) {
    console.log(err);
    await interaction
      .editReply({
        content: "Error adding question",
        ephemeral: true,
      })
      .catch((error) => logger.error(error));
  } finally {
    await client.close();
  }
};

loadModel();
module.exports = tensorCommands;
