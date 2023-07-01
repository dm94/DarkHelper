require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const wpTrainer = require("./trainers/wpTrainer");

const uri = process.env.MONGODB_CONNECTION;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const addItemsToDatabase = async (items) => {
  try {
    await client.connect();
    const collection = client.db("dark").collection("extraquestions");
    await collection.insertMany(items);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  } finally {
    await client.close();
  }
};

(async () => {
  const items = await wpTrainer.getItemsFromWiki("https://darkorbitwiki.com");
  console.log("https://darkorbitwiki.com", items.length);

  const databaseItems = items.map((item) => {
    return {
      guilid: "https://darkorbitwiki.com",
      language: "en",
      question: item.title,
      answer: item.content,
    };
  });

  addItemsToDatabase(databaseItems);
})();
