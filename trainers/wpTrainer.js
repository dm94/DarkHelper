const controller = {};
const items = [];

const parsePageToItem = (page) => {
  const title = page?.title?.rendered;
  const content = page?.content?.rendered;

  if (!title || !content) {
    return;
  }

  let cleaned = content.replace(/(<([^>]+)>)/g, "");
  cleaned = cleaned.replace(/(?:https?|ftp):\/\/[\n\S]+/g, "");
  cleaned = cleaned.replace("\n", "");

  items.push({
    title: String(title),
    content: `${cleaned}`,
  });
};

const fetchWikiPage = async (url) => {
  try {
    const response = await fetch(url);
    const json = await response.json();
    if (!Array.isArray(json) || json.length <= 0) {
      return false;
    }

    json.forEach((page) => parsePageToItem(page));
    return true;
  } catch (error) {
    console.log(error);
  }

  return false;
};

controller.getItemsFromWiki = async (baseUrl) => {
  let page = 1;
  let hasMore = true;

  do {
    console.log(
      new Date().toLocaleTimeString(),
      `WP: ${baseUrl} | Page: ${page}`
    );
    hasMore = await fetchWikiPage(
      `${baseUrl}/wp-json/wp/v2/pages?page=${page}`
    );
    page++;
  } while (hasMore);

  return items;
};

module.exports = controller;
