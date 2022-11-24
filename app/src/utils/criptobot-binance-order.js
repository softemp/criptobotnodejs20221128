let api = function ProcessOrder(options = {}) {
    if (!new.target) return new ProcessOrder(options);
    let ProcessOrder = this
    const Binance = require("node-binance-api");

    const BINANCE_LOGS = process.env.BINANCE_LOGS
    const BINANCE_RECV_WINDOW = process.env.BINANCE_RECV_WINDOW

    const default_options = {
        APIKEY: false,
        APISECRET: false,
        binance: false
    }
    ProcessOrder.options = default_options
    if (options) setOptions(options)
    async function setOptions(opt) {
        if (opt.APIKEY) ProcessOrder.options.APIKEY = opt.APIKEY
        if (opt.APISECRET) ProcessOrder.options.APISECRET = opt.APISECRET
        if (ProcessOrder.options.APIKEY && ProcessOrder.options.APISECRET && !ProcessOrder.binance) {
            const binanceConnection = await new Binance().options({
                APIKEY: ProcessOrder.options.APIKEY,
                APISECRET: ProcessOrder.options.APISECRET,
                recvWindow: BINANCE_RECV_WINDOW,
                verbose: BINANCE_LOGS
            })
            ProcessOrder.binance = binanceConnection
        }
        return ProcessOrder
    }
    async function newOrder(symbol, amount, price, side, leverage, newClientOrderId) {
        return new Promise(async (resolve, reject) => {
            await ProcessOrder.binance.futuresLeverage(symbol, leverage)
        let order = await ProcessOrder.binance.futuresOrder(side, symbol, amount, price, {
            type: 'STOP',
            stopPrice: price,
            timeInForce: 'GTC',
            newOrderRespType: 'RESULT',
            newClientOrderId
        })
        if (order['code'] == '-2021') {
            order = await ProcessOrder.binance.futuresOrder(side, symbol, amount, price, {
                type: 'TAKE_PROFIT',
                stopPrice: price,
                timeInForce: 'GTC',
                orderRespType: 'RESULT',
                newClientOrderId
            })
        }
        order.orderId = parseInt(order.orderId)
        // if (order.code) return errorCode(order)
        // if (order.orderId) return order
        // else return false
        if(order.orderId) return resolve(order)
        if(order.code) return reject(order)
            
        })
        await ProcessOrder.binance.futuresLeverage(symbol, leverage)
        let order = await ProcessOrder.binance.futuresOrder(side, symbol, amount, price, {
            type: 'STOP',
            stopPrice: price,
            timeInForce: 'GTC',
            newOrderRespType: 'RESULT'
        })
        if (order['code'] == '-2021') {
            order = await ProcessOrder.binance.futuresOrder(side, symbol, amount, price, {
                type: 'TAKE_PROFIT',
                stopPrice: price,
                timeInForce: 'GTC',
                orderRespType: 'RESULT'
            })
        }
        order.orderId = parseInt(order.orderId)
        if (order.code) return errorCode(order)
        if (order.orderId) return order
        else return false
    }

    async function takeProffitOrder(baseOrder, takeProfitPrice) {
        const takeProffitOrder = await ProcessOrder.binance.futuresOrder(baseOrder.side == 'BUY' ? 'SELL' : 'BUY', baseOrder.symbol, false, false, {
            type: 'TAKE_PROFIT_MARKET',
            stopPrice: parseFloat(takeProfitPrice),
            timeInForce: 'GTC',
            closePosition: true
        })
        takeProffitOrder.orderId = parseInt(takeProffitOrder.orderId)
        if (takeProffitOrder.code) return errorCode(takeProffitOrder)
        if (takeProffitOrder.orderId) return takeProffitOrder
        else return false
    }

    async function stopLossOrder(baseOrder, stopPrice) {
        const stopLossOrder = await ProcessOrder.binance.futuresOrder(baseOrder.side == 'BUY' ? 'SELL' : 'BUY', baseOrder.symbol, false, false, {
            type: 'STOP_MARKET',
            stopPrice: parseFloat(stopPrice),
            timeInForce: 'GTC',
            closePosition: true
        })
        stopLossOrder.orderId = parseInt(stopLossOrder.orderId)
        if (stopLossOrder.code) return errorCode(stopLossOrder)
        if (stopLossOrder.orderId) return stopLossOrder
        else return false
    }

    async function errorCode(o) {
        if (o.code == '-2014') return 'Verifique sua APIKEY e APISECRET'
        if (o.code == '-4013') return 'Preço inferior ao preço mínimo. Verifique os parâmetros de entrada'
        if (o.code == '-2021') return 'Preço tp ou sl acima ou abaixo do preço permitido'
        if (o.code) return 'Erro não identificado. Verifique os LOGS do sistema.'
    }

    return {
        futuresNewOrderLimit: newOrder,
        futuresNewTpSlOrderLimit: async function (symbol, amount, price, side, leverage, tpPrice, slPrice) {
            let baseOrder, tpOrder, slOrder
            baseOrder = await newOrder(symbol, amount, price, side, leverage)
            if (baseOrder) tpOrder = await takeProffitOrder(baseOrder, tpPrice)
            if (baseOrder) slOrder = await stopLossOrder(baseOrder, slPrice)
            return { baseOrder, tpOrder, slOrder }
        },
        options: setOptions,
        getOptions: ProcessOrder.options
    }
}
module.exports = api
