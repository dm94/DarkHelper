require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs-extra");

const controller = {};
const trained = [];

const uri = process.env.MONGODB_CONNECTION;
const openAIUrl = process.env.OPEN_AI_URL;
const openAiGptModel = process.env.OPEN_AI_GPT_MODEL;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

controller.addItemsToDatabase = async (items) => {
  try {
    await client.connect();
    const collection = client.db("dark").collection("trained");
    await collection.insertMany(items);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  } finally {
    await client.close();
  }
};

controller.getData = async () => {
  let data = [];
  try {
    await client.connect();
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
};

controller.askToAI = async (question) => {
  const content = `I am going to pass you a question with an answer and I want you to answer me only in json format with a percentage of the correctness of that answer to the question and also with an answer that you think is more convenient.
  Example answer: { 'hit': 80, 'answer': 'This is an example of a response' }
  Question and answer:
  Question: '${question.question}'
  Answer: '${question.answer}'`;

  const data = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `${openAiGptModel}`,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      temperature: 1,
      top_p: 1,
      n: 1,
      stream: false,
      max_tokens: 250,
      presence_penalty: 0,
      frequency_penalty: 0,
    }),
  };

  try {
    const response = await fetch(`${openAIUrl}/chat/completions`, data);
    const parsed = await response.json();

    if (parsed?.hit && Number(parsed.hit) > 50) {
      trained.push(question);
    }

    if (parsed?.answer) {
      trained.push({
        guilid: "IA",
        language: "en",
        question: question.question,
        answer: parsed.answer,
      });
    }
  } catch (error) {
    console.error(error);
  }
};

controller.trainModelAndExport = async () => {
  const data = await controller.getData();

  const onlyEn = data.filter((question) => question.language === "en");

  for await (const question of onlyEn) {
    await controller.askToAI(question);
  }

  fs.writeFile("modelAiTrained.json", JSON.stringify(trained));
};

module.exports = controller;
