const Binance = require("node-binance-api");

const BINANCE_LOGS = process.env.BINANCE_LOGS
const BINANCE_RECV_WINDOW = process.env.BINANCE_RECV_WINDOW

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
            recvWindow: BINANCE_RECV_WINDOW,
            verbose: BINANCE_LOGS
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
        // console.log('margin_call_callbakc', data);
    }
    async function account_update_callback(data) {
        // console.log('account_update_callback', data);
    }
    // let time = 1000
    let time = 500
    async function order_update_callback(data, client, binance) {
        // time = time + 1000
        time = time + 500
        setTimeout(async () => {
            await registerOrder(data, client, binance)
            // time = time - 1000
            time = time - 500
        }, time);
    }

    async function registerOrder(data, client, binance) {

        // console.log('status da ordem: ',`${data.clientOrderId} = ${data.orderStatus}`)
        data = data.order
        data.traderId = client.traderId
        data.status = data.orderStatus
        data.origQty = data.originalQuantity
        data.type = data.originalOrderType
        data.isMaker = data.isMakerSide
        data.reduceOnly = data.isReduceOnly
        data.updateTime = data.orderTradeTime
        data.activatePrice = data.activationPrice
        data.priceRate = data.callbackRate

        delete data.orderType
        if (data.status === 'CANCELED') data.isWorking = 0

        const orderDB = await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: data.clientOrderId } })
        let orderDBF
        if (orderDB) {

            if (data.status === 'FILLED') {
                data.avgPrice = parseFloat(data.averagePrice);
                data.commissionAsset = data.commissionAsset
                data.commission = data.commission;
                data.executedQty = data.orderFilledAccumulatedQuantity;

                const isQuoteCommission = data.commissionAsset && orderDB.symbol.endsWith(data.commissionAsset);
                const notional = parseFloat(orderDB.origQty) * data.avgPrice;//volume operado
                data.cummulativeQuoteQty = notional - (isQuoteCommission ? parseFloat(data.commission) : 0);//volume operado - comissao
                data.realizedProfit = data.realizedProfit;//gain ou loss
                // data.obs = `Profit=${data.realizedProfit}. Commission=${data.commissionAsset}`;
            }

            await app.DB.models.BotOrderTraders.update(data, { where: { clientOrderId: orderDB.clientOrderId } })
            orderDBF = await app.DB.models.BotOrderTraders.findOne({ raw: true, where: { clientOrderId: orderDB.clientOrderId } })
        } else {
            orderDBF = await app.DB.models.BotOrderTraders.create(data)
        }

        const order = Object.assign({}, data, orderDBF)

        const positionRisk = (await binance.futuresPositionRisk({ symbol: data.symbol }))[0]
        const automation = order.automationId ? await app.DB.models.Strautomations.findOne({ raw: true, where: { id: order.automationId } }) : false

        if (automation) {

            if (parseFloat(positionRisk.entryPrice) !== 0
                && automation.conditions.indexOf("CHANNEL-BREAK") !== -1
                && data.status === 'FILLED'
                && order.closePosition === 0
            ) {
                const symbolFilter = await app.symbolFilters.getSymbolFilter(data.symbol, automation)
                const price = parseFloat(order.price)
                //alvo da operação
                let tpPrice
                //stop da operação
                let slPrice
                //retorno da criação da orden de SL na Binance
                let slOrder

                await binance.futuresCancelAll(data.symbol)

                //buscando o indicador
                // const automationEnd = await app.redis.getAll()
                console.log('+++++++++++++++++++++++: entrando no TP e SL')
                if (automation.takeProfit){
                    //verificando se a condição é porcentagem
                    const porcent = await automation.tpConditions.indexOf("PORCENT") !== - 1
                    if (porcent) {
                        const tp = parseFloat(automation.tpConditions.split("*")[1])
                        tpPrice = (order.side === "BUY" ? price * tp : price / tp).toFixed(symbolFilter.LOT_SIZE.tickSize)
                    } else {
                        const tpConditions = await automation.tpConditions.split('.')
                        const tpIndicator = tpConditions[0]
                        const tpMultiplicador = tpConditions[1].split('*')
                        // console.log('tpConditions: ',tpConditions);
                        // console.log('tpIndicator: ',tpIndicator);
                        // console.log('tpMultiplicador: ',tpMultiplicador);
                        const monitorData = JSON.parse(await app.redis.get(tpIndicator))
                        if (!monitorData)return false
                        const tp = monitorData['current'] * tpMultiplicador[1]

                        // console.log('valueIndicator: ',tp);

                        tpPrice = (order.side === "BUY" ? price + tp : price - tp).toFixed(symbolFilter.LOT_SIZE.tickSize)
                    }
                    // console.log('+++++++++++++++++++++++ TP: ', tpPrice)
                    if (tpPrice) {
                        try {
                            app.telegram.sendMessage(`
                        TakeProfit da automação: ${automation.name}
                        Symbol: ${automation.symbol}
                        Preço da ordem: ${tpPrice},
                        `)

                            // await binance.futuresCancelAll(data.symbol)
                            await takeProffitOrder(order, tpPrice, binance)
                        } catch (error) {
                            console.log('Erro ao lançar ordem TakeProfit: ', error);
                        }
                    }
                }

                if (automation.stopLoss){

                    //verificando se a condição é porcentagem
                    const porcent = await automation.slConditions.indexOf("PORCENT") !== - 1
                    if (porcent) {
                        const sl = parseFloat(automation.slConditions.split("*")[1])
                        slPrice = (order.side === "BUY" ? price / sl : price * sl).toFixed(symbolFilter.LOT_SIZE.tickSize)
                    } else {
                        const slConditions = await automation.slConditions.split('.')
                        const slIndicator = slConditions[0]
                        const slMultiplicador = slConditions[1].split('*')
                        const monitorData = JSON.parse(await app.redis.get(slIndicator))
                        if (!monitorData)return false
                        const sl = monitorData['current'] * slMultiplicador

                        slPrice = (order.side === "BUY" ? price - sl : price + sl).toFixed(symbolFilter.LOT_SIZE.tickSize)
                    }
                    // console.log('+++++++++++++++++++++++ SL: ', slPrice)
                    if (slPrice) {
                        try {
                            app.telegram.sendMessage(`
                        StopLoss da automação: ${automation.name}
                        Symbol: ${automation.symbol}
                        Preço da ordem: ${slPrice},
                        `)
                            // await binance.futuresCancelAll(data.symbol)
                            slOrder = await stopLossOrder(order, slPrice, binance)
                        } catch (error) {
                            console.log('Erro ao lançar ordem StopLoss: ', error);
                        }
                    }
                }

                //breakEven
                if (automation.breakEven && tpPrice && slOrder) {
                    breakEvenMonitor.push({ order, slOrder, automation, binance, tpPrice })
                }
            }
        }

        const tpsl = (data.type === 'TAKE_PROFIT_MARKET' || data.type === 'STOP_MARKET')
        if (data.closeAll && tpsl === true && data.status === 'FILLED') {
            await binance.futuresCancelAll(data.symbol)
            for (const bk of breakEvenMonitor) {
                if (bk.slOrder.clientOrderId === data.clientOrderId) breakEvenMonitor.splice(breakEvenMonitor.indexOf(bk), 1)
            }
        }
        if( process.env.DESTROY_CANCELED_ORDERS  && data.status === 'CANCELED') await app.DB.models.BotOrderTraders.destroy({ where: { status: 'CANCELED' } })
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
                side: baseOrder.side === 'BUY' ? 'SELL' : 'BUY',
                updateTime: Date.now(),
                isWorking: true,
                closePosition: true,
                orderTraderId: baseOrder.id
            })

            const resultOrderBinance = await binance.futuresOrder(
                baseOrder.side === 'BUY' ? 'SELL' : 'BUY',
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
            return error
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
                side: baseOrder.side === 'BUY' ? 'SELL' : 'BUY',
                updateTime: Date.now(),
                isWorking: true,
                closePosition: true,
                orderTraderId: baseOrder.id
            })

            const resultOrderBinance = await binance.futuresOrder(
                baseOrder.side === 'BUY' ? 'SELL' : 'BUY',
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
                        let diferenca = (bk.order.side == 'BUY' ? parseFloat(bk.order.price) - bk.tpPrice : bk.tpPrice - parseFloat(bk.order.price));
                        if (bk.order.side == 'BUY') {
                            valorBreak = (parseFloat(bk.order.price) - ((diferenca * bk.automation.beConditions) - diferenca));
                        } else {
                            valorBreak = (parseFloat(bk.order.price) + ((diferenca * bk.automation.beConditions) - diferenca));
                        }
                    }
                    // if (bk.order.side == 'SELL' && data.c <= valorBreak) {
                    if (bk.order.side == 'SELL' && data.c < valorBreak) {
                        await bkOrder(bk)
                    // } else if (bk.order.side == 'BUY' && data.c >= valorBreak) {
                    } else if (bk.order.side == 'BUY' && data.c > valorBreak) {
                        await bkOrder(bk)
                    }
                }
            }

        })
        async function bkOrder(bk) {
            try {
                app.telegram.sendMessage(`
                        BreakEven da automação: ${bk.automation.name}
                        Symbol: ${bk.automation.symbol}
                        Preço da ordem: ${bk.order.price},
                        `)

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
}

module.exports = startFuturesMonitor