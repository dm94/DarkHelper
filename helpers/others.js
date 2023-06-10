const controller = {};

const logger = require("./logger");

controller.sendChannelMessage = (channel, text) => {
  controller.sendChannelData(channel, text);
};

controller.sendChannelData = (channel, data) => {
  channel.send(data).catch((error) => {
    logger.error(error);
  });
};

module.exports = controller;
