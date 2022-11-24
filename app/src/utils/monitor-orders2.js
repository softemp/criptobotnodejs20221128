const Binance = require("node-binance-api");
const MonitorEx = require("./monitor-orders-exchange")
let breakEvenMonitor = []
async function startFuturesMonitor(app) {
    breakEven()
    const clients = await app.DB.models.ExCredentials.findAll({
        raw: true,
        where: {
            statusBotFutures: 1,
            enableFutures: 1,
        }
    })

    for (const client of clients) {
        const binance = await new Binance({
            APIKEY: client.accessKey,
            APISECRET: client.secretKey,
            recvWindow: 30000
        })
        await binance.websockets.userFutureData(
            margin_call_callbakc,
            account_update_callback,
            data =>
                order_update_callback(data, client, binance),
            data => binance.options.futuresListenKey = data
        )
    }

    async function margin_call_callbakc(data) {
        console.log('margin_call_callbakc', data);
    }
    async function account_update_callback(data) {
        console.log('account_update_callback', data);
    }
    let oUCTime = 500
    async function order_update_callback(data, client, binance) {
        oUCTime = oUCTime + 500
        setTimeout(async () => {
            await registerOrder(data, client, binance)
            oUCTime = oUCTime - 500
        }, oUCTime);
    }

    async function registerOrder(dataWs, client, binance) {
        const order = await createOrUpdate(dataWs, client)

        console.log('order: ', order);

        const positionRisk = (await binance.futuresPositionRisk({ symbol: order.symbol }))[0]
        const automation = order.automationId ? await app.DB.models.Strautomations.findOne({ raw: true, where: { id: order.automationId } }) : false

        if (parseFloat(positionRisk.entryPrice) !== 0
            && automation.conditions.indexOf("CHANNEL-BREAK") !== -1
            && order.status == 'FILLED'
            && order.closePosition == 0
            && order.automationId
        ) {
            const price = parseFloat(order.price)
            const tp = parseFloat(automation.tpConditions.split("*")[1])
            const sl = parseFloat(automation.slConditions.split("*")[1])
            const tpPrice = (order.side == "BUY" ? price * tp : price / tp).toFixed(2)
            const slPrice = (order.side == "BUY" ? price / tp : price * sl).toFixed(2)


            const assistOrders = await new MonitorEx(app, order, binance)
            const newOrder = await assistOrders.newTpSlOrder(tpPrice, slPrice)
            const slOrder = await newOrder.slOrder

            console.log('newOrder', newOrder);

            // if (automation.breakEven) breakEvenMonitor.push({ order, slOrder, automation, binance, tpPrice })
        }

        const tpsl = (order.type == 'TAKE_PROFIT_MARKET' || order.type == 'STOP_MARKET')
        console.log('tpsl: ', tpsl);
        console.log("parseFloat(positionRisk.entryPrice) == 0 && order.closePosition == 1 && tpsl && order.status == 'FILLED'", order.closeAll && tpsl && order.status == 'FILLED');
        console.log(order);
        if (order.closeAll && tpsl == true && order.status == 'FILLED') {
            await binance.futuresCancelAll(order.symbol)
        }
    }

    async function createOrUpdate(data, client) {
        data = data.order
        data.traderId = client.traderId
        data.status = data.orderStatus
        data.origQty = data.originalQuantity
        data.type = data.originalOrderType
        data.updateTime = data.orderTradeTime
        delete data.orderType
        if (data.status == 'CANCELED') data.isWorking = 0

        const orderB = await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: data.clientOrderId } })
        let order
        if (orderB) {
            await app.DB.models.BotOrderTraders.update(data, { where: { clientOrderId: orderB.clientOrderId } })
            order = await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: orderB.clientOrderId } })
        } else {
            order = await app.DB.models.BotOrderTraders.create(data)
        }
        const resultCreateUpdate = Object.assign({}, data, order)
        console.log('resultCreateUpdate: ', resultCreateUpdate);
        return await resultCreateUpdate
    }

    async function breakEven() {
        app.events.on("monitor:prices", async (data) => {

            for (const bk of breakEvenMonitor) {
                if (bk) {
                    if (data.s == bk.slOrder.symbol) {
                        let valorBreak;
                        if (bk.automation.breakEven) {
                            let diferenca = (bk.order.side == 'BUY' ? parseFloat(bk.order.price) - bk.tpPrice : bk.tpPrice - parseFloat(bk.order.price));
                            if (bk.order.side == 'BUY') {
                                valorBreak = (parseFloat(bk.order.price) - ((diferenca * bk.automation.beConditions) - diferenca));
                            } else {
                                valorBreak = (parseFloat(bk.order.price) + ((diferenca * bk.automation.beConditions) - diferenca));
                            }
                        }
                        if (bk.order.side == 'SELL' && data.c <= valorBreak) {
                            await bkOrder(bk)
                        } else if (bk.order.side == 'BUY' && data.c >= valorBreak) {
                            await bkOrder(bk)
                        }
                    }
                }
            }
        })
        async function bkOrder(bk) {
            try {
                await breakEvenMonitor.splice(breakEvenMonitor.indexOf(bk), 1)
                await stopLossOrderBreak(bk.order, bk.order.price, bk.binance)
                await bk.binance.futuresCancel(bk.order.symbol, { clientOrderId: bk.slOrder.clientOrderId })
                return true
            } catch (error) {
                console.log(error);
                return error
            }
        }

        async function stopLossOrderBreak(baseOrder, stopPrice, binance) {
            try {
                const resultOrderDb = await app.DB.models.BotOrderTraders.create({
                    automationId: baseOrder.automationId,
                    traderId: baseOrder.traderId,
                    orderId: Math.floor(Date.now() * Math.random()),
                    clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
                    symbol: baseOrder.symbol,
                    status: 'NEW',
                    origQty: baseOrder.origQty,
                    type: 'FUTURES',
                    side: baseOrder.side == 'BUY' ? 'SELL' : 'BUY',
                    updateTime: Date.now(),
                    isWorking: true,
                    closePosition: true,
                    orderTraderId: baseOrder.id
                })

                const resultOrderBinance = await binance.futuresOrder(
                    baseOrder.side == 'BUY' ? 'SELL' : 'BUY',
                    baseOrder.symbol, false, false, {
                    newClientOrderId: resultOrderDb.clientOrderId,
                    type: 'STOP_MARKET',
                    stopPrice: parseFloat(stopPrice),
                    timeInForce: 'GTC',
                    closePosition: true
                })

                const updateOrderDb = await app.DB.models.BotOrderTraders.update(resultOrderBinance, {
                    where: {
                        clientOrderId: resultOrderBinance.clientOrderId
                    }
                })
                return resultOrderBinance
            } catch (error) {
                await app.DB.models.BotOrderTraders.destroy({ where: { id: resultOrderDb.id } })
                await binance.futuresCancel(resultOrderDb.symbol, { clientOrderId: resultOrderDb.clientOrderId })
                console.log(error);
                return error
            }
        }
    }
}

module.exports = startFuturesMonitor