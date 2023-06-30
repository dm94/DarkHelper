const tensorCommands = {};

const { NormalizerEs, StemmerEs, StopwordsEs } = require("@nlpjs/lang-es");
const { NormalizerEn, StemmerEn, StopwordsEn } = require("@nlpjs/lang-en");
const { dockStart } = require("@nlpjs/basic");

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

const normalizerEs = new NormalizerEs();
const normalizerEn = new NormalizerEn();

const stemmerEs = new StemmerEs();
stemmerEs.stopwords = new StopwordsEs();

const stemmerEn = new StemmerEn();
stemmerEn.stopwords = new StopwordsEn();

let nlp = null;

(async () => {
  const dock = await dockStart({
    settings: {
      nlp: {
        forceNER: true,
        languages: ["en", "es"],
      },
    },
    use: ["Nlp", "Basic", "LangEn", "LangEs"],
  });
  nlp = dock.get("nlp");
  nlp.addLanguage("es");
  nlp.addLanguage("en");
  await loadModel();
})();

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
      if (!data.question || !data.answer) {
        return;
      }

      const language = data.language ?? "es";
      let formatted = data.answer;

      if (language === "es") {
        const tokens = stemmerEs.tokenizeAndStem(data.question, false);
        formatted = tokens.join(".").toLowerCase();
      } else if (language === "en") {
        const tokens = stemmerEn.tokenizeAndStem(data.question, false);
        formatted = tokens.join(".").toLowerCase();
      }

      nlp.addDocument(language, data.question, formatted);
      nlp.addAnswer(language, formatted, data.answer);
    });
    await nlp.train();
    nlp.save();
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

  const language = interaction.options
    .getString("language")
    .trim()
    .toLowerCase();

  const response = await tensorCommands.answerMessage(question, language);
  await interaction
    .editReply({
      content: response || "No answer",
      ephemeral: false,
    })
    .catch((error) => logger.error(error));
};

tensorCommands.answerMessage = async (message, language) => {
  if (language === "es") {
    message = normalizerEs.normalize(message);
  } else if (language === "en") {
    message = normalizerEn.normalize(message);
  }

  const response = await nlp.process(language, message);

  console.log(response);

  if (response.answer) {
    return response.answer;
  }

  return null;
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
    if (
      interaction?.member?.id &&
      interaction.member.id === process.env.DISCORD_OWNER_ID
    ) {
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
        guilid: interaction.guildId,
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

module.exports = tensorCommands;
