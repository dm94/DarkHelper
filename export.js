require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require("fs-extra");

const uri = process.env.MONGODB_CONNECTION;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function getData() {
  let data = [];
  try {
    await client.connect();
    const collection = client.db("dark").collection("questions");
    data = await collection
      .find({}, { projection: { _id: 0, question: 1, answer: 1, language: 1 } })
      .toArray();

    data = data.map((item) => {
      return {
        question: item.question,
        answer: item.answer,
        language: item.language ?? "es",
      };
    });

    console.info(new Date().toLocaleTimeString(), "Data: Loaded from DB");
  } finally {
    await client.close();
  }

  return data;
}

const loadModel = async () => {
  const data = await getData();
  fs.writeFile("modelDarkHelper.json", JSON.stringify(data));
};

loadModel();
