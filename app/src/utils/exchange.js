const Binance = require("node-binance-api");
// const binance = new Binance();
// // const binance = new Binance();
const BINANCE_LOGS = process.env.BINANCE_LOGS
const BINANCE_RECV_WINDOW = process.env.BINANCE_RECV_WINDOW

const binance = new Binance().options({
  recvWindow: BINANCE_RECV_WINDOW,
  verbose: BINANCE_LOGS
});
let awaitSeconds = 500;
let sumSeconds = 500;

module.exports = (app) => {
  const methods = new Object();

    async function saveCacheFutures(data) {
    if (data.k.x) app.events.emit("newCandle", data.k);
    if (!data.k.x) app.events.emit("monitor:prices", data.k);
  }

  methods.fsubscribe = (symbol, timeframe) => {
    symbol = symbol.toLowerCase();
    // console.log(`${symbol}@kline_${timeframe}`);
    binance.futuresSubscribe(`${symbol}@kline_${timeframe}`, saveCacheFutures);
  };

  methods.fcandles = async (symbol, timeframe, limit = 500) => {
    return new Promise((resolve) => {
      awaitSeconds = awaitSeconds + sumSeconds;
      setTimeout(async () => {
        awaitSeconds = awaitSeconds - sumSeconds;
        binance.futuresCandles(symbol, timeframe, { limit })
          .then(d => {
            resolve(d)
          })
          .catch(err => {
            console.log("Erro ao carregar os candles", err);
          })
      }, awaitSeconds);
    });
  };

  methods.subscriptions = async () => {
    const subs = await binance.futuresSubscriptions();
    return subs;
  };

  return methods;
};
