const index = require("./indexes");

module.exports = async (app, data, exchange) => {
  const cb = await index.channelBreak(app, data, exchange);
  if (cb) {
    app.telegram.sendMessage(
      `${cb}, Symbol: ${data.s}, timeframe: ${data.i}, preço: ${data.c}`
    );
    console.log(cb);
  }
};
