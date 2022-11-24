const logger = require("./utils/logger");
const technicalindicators = require("technicalindicators");

module.exports = {
    LAST_CANDLE: (history) => {
      const ht = history.length - 1
      const ht2 = history.length - 2
      const cl = {
        open: history[ht][1],
        high: history[ht][2],
        low: history[ht][3],
        close: history[ht][4],
        volume: history[ht][5]
      }
      const cl2 = {
        open: history[ht2][1],
        high: history[ht2][2],
        low: history[ht2][3],
        close: history[ht2][4],
        volume: history[ht2][5]
      }
      return {
        current: cl,
        previous: cl2
      };
    },
    CURRENT_PRICE: async (history) => {
      const cp = history[history.length - 1][4]
      return await cp;
    },

    // PORCENT: async (history) => {
    //   const cp = history[history.length - 1][4]
    //   return await cp;
    // },

    PREVIOUS_CANDLE: (history) => {
        const ht2 = history.length - 2
            const cl2 = {
              open: history[ht2][1],
              high: history[ht2][2],
              low: history[ht2][3],
              close: history[ht2][4],
              volume: history[ht2][5]
            }
        return cl2
    },

    ATR: async (history, period = 14) => {
        const ohlc = await ohlcPaulo(history);
        period = parseInt(period);
        if (ohlc.high.length <= period) return {current: false, previous: false};

        const atrResult = technicalindicators.atr({
          high: ohlc.high,
          low: ohlc.low,
          close: ohlc.close,
          period
        })
        return {
          current: atrResult[atrResult.length - 1],
          previous: atrResult[atrResult.length - 2]
        }
    },

    bollingerBands: async (history, period = 20, stdDev = 2) => {
        period = parseInt(period);
        stdDev = parseInt(stdDev);
        const closes = await getCloses(history, period)

        if (closes.length <= period) return { current: false, previous: false };

        const bbResult = technicalindicators.bollingerbands({
          period,
          stdDev,
          values: closes
        })

        return {
          current: bbResult[bbResult.length - 1],
          previous: bbResult[bbResult.length - 2]
        }
    },

    channelBreak: async (history, period) =>{
        const ohlc = await ohlcPaulo(history);

        const candleMaxim = ohlc.high.reverse();
        const candleMinim = ohlc.low.reverse();

        //calculando maxima e minima anterior
        const candleMaAnterior = candleMaxim.slice(2, parseFloat(period)+2);
        const candleMiAnterior = candleMinim.slice(2, parseFloat(period)+2);
        const maxValueAnterior = Math.max(...candleMaAnterior);
        const minValueAnterior = Math.min(...candleMiAnterior);

        //calculando maxima e minima atual
        const candleMaAtual = candleMaxim.slice(1, parseFloat(period)+1);
        const candleMiAtual = candleMinim.slice(1, parseFloat(period)+1);
        const maxValueAtual = Math.max(...candleMaAtual);
        const minValueAtual = Math.min(...candleMiAtual);

        console.log('Maxima: '+maxValueAtual+' = '+maxValueAnterior);
        console.log('Minima: '+minValueAtual+' = '+minValueAnterior);

        //se o valor de (previous) for 0 e então diferente do preço atual (current) vai disparar uma ação então se o preço anterior for 0 deixo o preço atual como preço anterior
        let currencyMax = maxValueAtual;
        let previousMax = maxValueAnterior;
        let currencyMin = minValueAtual;
        let previousMin = minValueAnterior;

        //se o maior preço mudou então mudamos a orden de compra o stop e o take profit
        if (maxValueAnterior !== maxValueAtual){
            console.log('maxima mudou: ',maxValueAtual);
        }
        //se o menor preço mudou então mudamos a orden de venda o stop e o take profit
        if (minValueAnterior !== minValueAtual){
            console.log('minima mudou: ',minValueAtual);
        }
        return new Object({
            current: new Object({ max: parseFloat(currencyMax), min: parseFloat(currencyMin) }),
            previous: new Object({ max: parseFloat(previousMax), min: parseFloat(previousMin) })
        })
    },

  RSI: async (history, period = 14) => {
    const closes = await getCloses(history, period);
    period = parseInt(period);
    if (closes.length <= period) return { current: false, previous: false };

    const rsiResult = technicalindicators.rsi({
      period,
      values: closes,
    });
    return {
      current: parseFloat(rsiResult[rsiResult.length - 1]),
      previous: parseFloat(rsiResult[rsiResult.length - 2]),
    };
  },

  StochRSI: async (
    history,
    dPeriod = 3,
    kPeriod = 3,
    rsiPeriod = 14,
    stochasticPeriod = 14
  ) => {
    dPeriod = parseInt(dPeriod);
    kPeriod = parseInt(kPeriod);
    rsiPeriod = parseInt(rsiPeriod);
    stochasticPeriod = parseInt(stochasticPeriod);
    const closes = await getCloses(history, rsiPeriod + stochasticPeriod + kPeriod + dPeriod);
    if (
      [dPeriod, kPeriod, rsiPeriod, stochasticPeriod].some(
        (p) => p >= closes.length
      )
    )
      return { current: false, previous: false };

    const stochResult = technicalindicators.stochasticrsi({
      dPeriod,
      kPeriod,
      rsiPeriod,
      stochasticPeriod,
      values: closes,
    });
    return {
      current: stochResult[stochResult.length - 1],
      previous: stochResult[stochResult.length - 2],
    };
  },

  CCI: async (history, period = 20) => {
    period = parseInt(period);
    const ohlc = await OHLCFunctio(history, period);
    if (ohlc.high.length <= period) return { current: false, previous: false };

    const cciResult = technicalindicators.cci({
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
      period,
    });
    return {
      current: cciResult[cciResult.length - 1],
      previous: cciResult[cciResult.length - 2],
    };
  },
};

async function ohlcPaulo( chart ) {
  let open = [],
      high = [],
      low = [],
      close = [],
      volume = [];
  for (let timestamp in chart) {
    let obj = chart[timestamp];
    open.push(parseFloat(obj[1]));
    high.push(parseFloat(obj[2]));
    low.push(parseFloat(obj[3]));
    close.push(parseFloat(obj[4]));
    volume.push(parseFloat(obj[7]));
  }
  return { open, high, low, close, volume };
}

async function OHLCFunction(history, period) {
  let open = [],
    high = [],
    low = [],
    close = [],
    volume = [];
  const chart = await reduceToPeriod(history, period);
  for (let timestamp in chart) {
    let obj = chart[timestamp];
    open.push(parseFloat(obj[1]));
    high.push(parseFloat(obj[2]));
    low.push(parseFloat(obj[3]));
    close.push(parseFloat(obj[4]));
    volume.push(parseFloat(obj[7]));
  }
  return { open, high, low, close, volume };
}

async function getCloses(history, period) {
  period = parseInt(period)
  const hc = await reduceToPeriod(history, period)
  const closeshc = [];
  console.log('getCloses: hc:', hc.length, 'PERIOD:', period);
  for (let c of hc) {
    closeshc.push(c[4]);
  }
  return closeshc
}

async function reduceToPeriod(history, period) {
  period = parseInt(period)
  const red = await history.slice(history.length - 10 - period, history.length - 1);
  return red
}
