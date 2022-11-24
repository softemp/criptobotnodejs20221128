const Monitor_order_exchange = function (app, baseOrder, binance) {

    let awaitTime = 500


    async function takeProffitOrder(takeProfitPrice) {
        awaitTime = awaitTime + 500
        setTimeout(() => {
            return new Promise(async (resolve, reject) => {
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
                    // return updateOrderDb
                    awaitTime = awaitTime - 500
                    tpOrder = updateOrderDb
                    return resolve(await updateOrderDb)
                } catch (error) {
                    await app.DB.models.BotOrderTraders.destroy({ where: { id: resultOrderDb.id } })
                    await binance.futuresCancel(resultOrderDb.symbol, { clientOrderId: resultOrderDb.clientOrderId })
                    console.log(error);
                    awaitTime = awaitTime - 500
                    return reject(error)
                }
            })
        }, awaitTime);

    }

    async function stopLossOrder(stopPrice) {
        awaitTime = awaitTime + 500
        setTimeout(() => {
            return new Promise(async (resolve, reject) => {
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
                    // return resultOrderBinance
                    awaitTime = awaitTime - 500
                    slOrder = resultOrderBinance
                    return resolve(await resultOrderBinance)
                } catch (error) {
                    await app.DB.models.BotOrderTraders.destroy({ where: { id: resultOrderDb.id } })
                    await binance.futuresCancel(resultOrderDb.symbol, { clientOrderId: resultOrderDb.clientOrderId })
                    console.log(error);
                    awaitTime = awaitTime - 500
                    return reject(error)
                }
            })
        }, awaitTime);
    }

    return {
        newTpSlOrder: async (tpPrice, slPrice)=>{
            return {
                tpOrder: await takeProffitOrder(tpPrice),
                slOrder: await stopLossOrder(slPrice)
            }
        },
        newSlOrder: async slPrice =>{
            return await stopLossOrder(slPrice)
        },
        newTpOrder: async tpPrice=>{
            return await takeProffitOrder(tpPrice)
        },
    }
}

module.exports = Monitor_order_exchange