const controller = {};

const Axios = require("axios");
const logger = require("./logger");

controller.sendChannelMessage = (channel, text) => {
  controller.sendChannelData(channel, text);
};

controller.sendChannelData = (channel, data) => {
  if (!controller.canSendMessages(channel)) {
    logger.warn(`No permissions to send message in channel: ${channel.id}`);
    return;
  }

  channel.send(data).catch((error) => {
    logger.error(error);
  });
};

controller.canSendMessages = (channel) => {
  try {
    if (!channel || !channel.guild) {
      return false;
    }

    const botMember = channel.guild.members.me;
    if (!botMember) {
      return false;
    }

    const permissions = channel.permissionsFor(botMember);
    return permissions?.has("SendMessages");
  } catch (error) {
    logger.error("Error checking permissions:", error);
    return false;
  }
};

controller.apiRequest = async (options) => {
  if (!process.env.APP_API_KEY || !process.env.APP_API_URL) {
    logger.error(
      "You need to configure the APP_API_KEY and APP_API_URL to use this function.",
    );
    return {
      success: false,
      data: "You need to configure the APP_API_KEY and APP_API_URL to use this function.",
    };
  }

  logger.info(options);

  options.headers = {
    apiKey: process.env.APP_API_KEY,
    "Content-type": "charset=utf-8",
  };

  return Axios.request(options)
    .then((response) => {
      if (response.status === "400") {
        return {
          success: false,
          data: "Error: Missing data",
        };
      }
      if (response.status === "401") {
        return {
          success: false,
          data: "Error: You do not have permissions",
        };
      }
      if (response.status === "404") {
        return {
          success: false,
          data: "Error: Nothing found",
        };
      }
      if (response.status === "503") {
        return {
          success: false,
          data: "Error connecting to database",
        };
      }
      return {
        success: true,
        data: response.data,
      };
    })
    .catch((error) => {
      logger.error(options.url);
      logger.error(error.message);
      if (error.response) {
        if (error.response.status === "400") {
          return {
            success: false,
            data: "Error: Missing data",
          };
        }
        if (error.response.status === "401") {
          return {
            success: false,
            data: "Error: You do not have permissions",
          };
        }
        if (error.response.status === "404") {
          return {
            success: false,
            data: "Error: Nothing found",
          };
        }
        if (error.response.status === "503") {
          return {
            success: false,
            data: "Error connecting to database",
          };
        }
      }
      return {
        success: false,
        data: "Error when connecting to the API",
      };
    });
};

module.exports = controller;
