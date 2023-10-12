const tensorCommands = {};

const { NormalizerEs, StemmerEs, StopwordsEs } = require("@nlpjs/lang-es");
const { NormalizerEn, StemmerEn, StopwordsEn } = require("@nlpjs/lang-en");
const { dockStart } = require("@nlpjs/basic");
const cld = require("cld");

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

const validLanguajes = [
  "en",
  "es",
  "tr",
  "pt",
  "pl",
  "hu",
  "it",
  "fr",
  "ro",
  "de",
  "bg",
  "nl",
];

let nlp = null;

(async () => {
  const dock = await dockStart({
    settings: {
      nlp: {
        languages: validLanguajes,
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

      if (!validLanguajes.includes(data.language)) {
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

  const language = await tensorCommands.detectLanguage(question);

  const response = await tensorCommands.getAnAnswer(question, language);
  await interaction
    .editReply({
      content: response || "No answer",
      ephemeral: false,
    })
    .catch((error) => logger.error(error));
};

tensorCommands.getAnAnswer = async (message, language) => {
  if (language === "es") {
    message = normalizerEs.normalize(message);
  } else if (language === "en") {
    message = normalizerEn.normalize(message);
  }

  const response = await nlp.process(language, message);

  if (response.answer) {
    return response.answer;
  }

  return null;
};

tensorCommands.addQuestion = async (interaction) => {
  const question = interaction.options
    .getString("question")
    .trim()
    .toLowerCase();

  const answer = interaction.options.getString("answer").trim().toLowerCase();
  const language = interaction.options
    .getString("language")
    .trim()
    .toLowerCase();

  addAnswer(interaction, language, question, answer);
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

  const language = await tensorCommands.detectLanguage(question);

  addAnswer(interaction, language, question, answer);
};

const addAnswer = async (interaction, language, question, answer) => {
  await interaction.deferReply({ ephemeral: true });

  if (!validLanguajes.includes(language)) {
    return;
  }

  let result = false;

  if (
    interaction?.member?.id &&
    interaction.member.id === process.env.DISCORD_OWNER_ID
  ) {
    result = await tensorCommands.addAnswerToDatabase(
      {
        language: language,
        question: question,
        answer: answer,
      },
      "questions"
    );
  } else {
    result = await tensorCommands.addAnswerToDatabase(
      {
        guilid: interaction?.member?.id ?? "",
        language: language,
        question: question,
        answer: answer,
      },
      "extraquestions"
    );
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

tensorCommands.addAnswerToDatabase = async (data, collectionName) => {
  let success = false;
  try {
    await client.connect();
    const collection = client.db("dark").collection(collectionName);
    await collection.insertOne(data);
    success = true;
    logger.info(`New data added to ${collectionName}`);
  } catch (err) {
    console.log(err);
    logger.error(err);
  } finally {
    await client.close();
  }

  return success;
};

tensorCommands.detectLanguage = async (text, fallBack = "en") => {
  try {
    const response = await cld.detect(text);
    if (response?.languages && response?.languages.length > 0) {
      return response.languages[0].code;
    }
  } catch (err) {
    logger.error(err);
  }
  return fallBack;
};

module.exports = tensorCommands;
