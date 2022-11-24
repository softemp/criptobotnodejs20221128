const Binance = require("node-binance-api");
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
    async function order_update_callback(data, client, binance) {
        setTimeout(() => {
            registerOrder(data, client, binance)
        }, 5000);
        // console.log('order_update_callback', data);
    }


    async function registerOrder(data, client, binance) {
        data = data.order
        data.traderId = client.traderId
        data.status = data.orderStatus
        data.origQty = data.originalQuantity
        data.type = data.originalOrderType
        data.updateTime = data.orderTradeTime
        delete data.orderType
        if (data.status == 'CANCELED') data.isWorking = 0

        const order = await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: data.clientOrderId } })
            .then(async obj => {
                if (obj) {
                    await app.DB.models.BotOrderTraders.update(data, { where: { clientOrderId: obj.clientOrderId } })
                    return await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: obj.clientOrderId } })
                }
                return await app.DB.models.BotOrderTraders.create(data)
            })
        console.log('order: ', order);

        const positionRisk = (await binance.futuresPositionRisk({ symbol: data.symbol }))[0]
        const automation = await app.DB.models.Strautomations.findOne({raw: true, where: { id: order.automationId } })

        if (parseFloat(positionRisk.entryPrice) !== 0
            && automation.conditions.indexOf("CHANNEL-BREAK") !== -1
            && data.status == 'FILLED'
            && order.closePosition == 0
        ) {
            const price = parseFloat(order.price)
            const tp = parseFloat(automation.tpConditions.split("*")[1])
            const sl = parseFloat(automation.slConditions.split("*")[1])
            const tpPrice = (order.side == "BUY" ? price * tp : price / tp).toFixed(2)
            const slPrice = (order.side == "BUY" ? price / tp : price * sl).toFixed(2)
            // await binance.futuresCancelAll(data.symbol)
            // await takeProffitOrder(order, tpPrice, binance)
            setTimeout(async () => {
                return await binance.futuresCancelAll(data.symbol)
            }, 500);
            setTimeout(async () => {
                return await takeProffitOrder(order, tpPrice, binance)
            }, 1000);
            const slOrder = setTimeout(async () => {
                return await stopLossOrder(order, slPrice, binance)
            }, 1500);
            if (automation.breakEven) breakEvenMonitor.push({ order, slOrder, automation, binance, tpPrice })
        }
        const tpsl = (data.type == 'TAKE_PROFIT_MARKET' || data.type == 'STOP_MARKET')
        console.log('tpsl: ', tpsl);
        console.log("parseFloat(positionRisk.entryPrice) == 0 && data.closePosition == 1 && tpsl && data.status == 'FILLED'", data.closeAll && tpsl && data.status == 'FILLED');
        // if (parseFloat(positionRisk.entryPrice) == 0 && data.closePosition == 1 && tpsl == true && data.status == 'FILLED') {
            console.log(data);
            if (data.closeAll && tpsl == true && data.status == 'FILLED') {
            await binance.futuresCancelAll(data.symbol)
        }
    }

    async function takeProffitOrder(baseOrder, takeProfitPrice, binance) {
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
                type: 'TAKE_PROFIT_MARKET',
                stopPrice: parseFloat(takeProfitPrice),
                timeInForce: 'GTC',
                closePosition: true
            })

            const updateOrderDb = await app.DB.models.BotOrderTraders.update(resultOrderBinance, {
                where: {
                    clientOrderId: resultOrderBinance.clientOrderId
                }
            })
            return updateOrderDb
        } catch (error) {
            await app.DB.models.BotOrderTraders.destroy({ where: { id: resultOrderDb.id } })
            await binance.futuresCancel(resultOrderDb.symbol, { clientOrderId: resultOrderDb.clientOrderId })
            console.log(error);
            return err
        }
    }

    async function stopLossOrder(baseOrder, stopPrice, binance) {
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

    async function breakEven() {
        app.events.on("monitor:prices", async (data) => {
            for (const bk of breakEvenMonitor) {
                if (data.s == bk.slOrder.symbol) {

                    let valorBreak;
                        if (bk.automation.breakEven) {
                            let diferenca = (bk.order.side == 'BUY' ? parseFloat(bk.order.price) - bk.tpPrice : bk.tpPrice - parseFloat(bk.order.price) );
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

        })
        async function bkOrder(bk) {
            try {
                await breakEvenMonitor.splice(breakEvenMonitor.indexOf(bk), 1)
                await stopLossOrder(bk.order, bk.order.price, bk.binance)
                await bk.binance.futuresCancel(bk.order.symbol, { clientOrderId: bk.slOrder.clientOrderId })
                return true
            } catch (error) {
                console.log(error);
                return error
            }
        }
    }

    function awaitTime(time, callback){
        return new Promise(async(resolve, reject) => {
            setTimeout(async() => {
                callback()
                .then(res => resolve(res))
                .catch(err => reject(err))
            }, time);
        })

    }
}

module.exports = startFuturesMonitor