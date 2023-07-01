const wpTrainer = require("./trainers/wpTrainer");

(async () => {
  const items = await wpTrainer.getItemsFromWiki("https://darkorbitwiki.com");
  console.log(items.length);
})();
