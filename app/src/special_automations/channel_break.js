const Binance = require("node-binance-api");
const criptoOrder = require('./../utils/criptobot-binance-order')

const BINANCE_LOGS = process.env.BINANCE_LOGS
const BINANCE_RECV_WINDOW = process.env.BINANCE_RECV_WINDOW

let app = false

async function
channelBreak( application, automation, currentPrice) {
    app = application
    try {
        switch ( automation.strategyType ) {
            case 'DEV':
                await orderDev(automation, currentPrice)
                break;
            case 'DEMO':
                await orderDemo(automation)
                break;
            default:
                break;
        }
    } catch ( error ) {
        console.log(error);
    }
}

async function orderDev( automation, currentPrice ) {

    const data = automation
    const cred = await app.DB.models.ExCredentials.findOne({
        raw: true,
        where: { id: data.exCredentialId, statusBotFutures: true, enableFutures: true }
    })

    if( !cred ) return false

    const binance = await new Binance({
        APIKEY: cred.accessKey,
        APISECRET: cred.secretKey,
        recvWindow: BINANCE_RECV_WINDOW,
        verbose: BINANCE_LOGS
    })

    const positionRisk = (await binance.futuresPositionRisk({ symbol: data.symbol }))[0]

    // const tpConditions = await data.tpConditions.split('.')
    // const tpIndicator = tpConditions[0]
    // const tpMultiplicador = tpConditions[1].split('*')
    // const monitorData = JSON.parse(await app.redis.get(tpIndicator))
    // if (!monitorData)return  false
    // const valueIndicator = monitorData['current']
    //
    // console.log('tpConditions: ',tpConditions);
    // console.log('tpIndicator: ',tpIndicator);
    // console.log('tpMultiplicador: ',tpMultiplicador);
    // console.log('valueIndicator: ',valueIndicator*tpMultiplicador[1]);

    // return false

    const client = await new criptoOrder({
        APIKEY: cred.accessKey,
        APISECRET: cred.secretKey,
    })

    const symbolFilter = await app.symbolFilters.getSymbolFilter(data.symbol, automation)

    //o valor de amount tera que vir do gerenciamento do capital(ainda não foi finalizado)
    const amount = 5
    const symbol = data.symbol
    const price = currentPrice
    const leverage = automation.leverage

    //se exisitir lote na automação usa ele senão calcula a partir capital * alavancagem
    const calLote = (automation.lote > 0 ? automation.lote : (amount * leverage) / price);
    const lote = parseFloat(calLote).toFixed(symbolFilter.LOT_SIZE.stepSize)

    //valida entre lote minimo e maximo permitido pela binance
    if (lote < symbolFilter.LOT_SIZE.minQty || lote > symbolFilter.LOT_SIZE.maxQty){
        app.telegram.sendMessage(`
            ${data.name}
            Lote: ${lote},
            Lote Minimo: ${symbolFilter.LOT_SIZE.minQty},
            Lote Máximo: ${symbolFilter.LOT_SIZE.maxQty},
            Revise os valores disponíveis para Operar.
        `)
        return false
    }
    const side = data.side

    if( parseFloat(positionRisk.entryPrice) === 0 ) {
        // buscar e excluir ordens new
        const orders = await app.DB.models.BotOrderTraders.findAll({
            raw: true,
            where: {
                traderId: cred.traderId,
                symbol: data.symbol,
                status: 'NEW',
                automationId: automation.id
            }
        })

        for ( const order of orders ) {
            if( order.id ) {
                if( parseFloat(order.price) !== parseFloat(currentPrice) ) {
                    await cancelOrder(order)
                } else {
                    return false
                }
            }
        }

        async function cancelOrder( order ) {
            await app.DB.models.BotOrderTraders.update({ status: 'CANCELED' }, { where: { orderId: order.orderId } })
            await binance.futuresCancel(order.symbol, { orderId: order.orderId })
            return true
        }

        try {
            const resultCreate = await app.DB.models.BotOrderTraders.create({
                automationId: automation.id,
                traderId: cred.traderId,
                orderId: Math.floor(Date.now() * Math.random()),
                clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
                symbol: data.symbol,
                status: 'NEW',
                origQty: lote,
                type: 'FUTURES',
                side,
                updateTime: Date.now(),
                isWorking: true
            })
            const ressultNewOrder = await client.futuresNewOrderLimit(symbol, lote, price, side, leverage, resultCreate.clientOrderId)
            const result_update = await app.DB.models.BotOrderTraders.update(ressultNewOrder, { where: { id: resultCreate.id } })

        } catch ( error ) {
            if( resultCreate ) await app.DB.models.BotOrderTraders.destroy({ where: { id: resultCreate.id } })
            if( resultCreate && ressultNewOrder ) await binance.futuresCancel(resultCreate.symbol, { clientOrderId: resultCreate.clientOrderId })
            console.log(error)
        }
    }

    app.telegram.sendMessage(`
        ${data.name}
        Symbol: ${data.symbol}
        Preço da ordem: ${currentPrice},
        Side: ${data.side}
    `)

    if( app.CHANNEL_BREAK ) app.logger(`CB: ${data.name}`, `${data.symbol}: ${currentPrice}`);
}

async function orderDemo( automation ) {
    const data = automation
    automations.splice(automations.indexOf(automation), 1)
    const cred = await app.DB.models.ExCredentials.findOne({ raw: true, where: { id: data.exCredentialId } })
    // buscar e excluir ordens new
    await app.DB.models.BotOrderDemos.findAll({
        raw: true,
        where: {
            traderId: cred.traderId,
            isWorking: true,
            symbol: data.symbol,
            side: data.side,
            status: 'NEW',
            orderDemoId: null
        }
    })
        .then(async res => {
            for ( const order of res ) {
                await app.DB.models.BotOrderDemos.destroy({ where: { id: order.id } })
            }
            return true
        })
    // fim buscar e excluir ordens new

    const mm = await data.conditions.indexOf("min") !== - 1 ? 'min' : 'max'
    const k = await app.redis.getAll()
    const kc = k.filter(e => e.indexOf("CHANNEL-BREAK") !== - 1)
    const cb = JSON.parse(await app.redis.get(kc[0]))
    const currentPrice = cb['current'][mm]
    const orderDemoData = {
        traderId: cred.traderId,
        automationId: data.id,
        entryType: 'SIGNAL',
        symbol: data.symbol,
        orderId: Math.floor(Date.now() * Math.random()),
        clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
        transactTime: Date.now(),
        type: 'LIMIT',
        side: data.side,
        status: 'NEW',
        price: currentPrice,
        origQty: 0.001,
        quantity: 0.001,
        comment: 'Bot Working',
        isWorking: true,
    }
    const orderDemos = await app.DB.models.BotOrderDemos.findAll({
        raw: true,
        where: { traderId: cred.traderId, isWorking: true, symbol: data.symbol, side: data.side }
    })
    // console.log(orderDemos.length);
    if( orderDemos.length === 0 ) {
        await app.DB.models.BotOrderDemos.create(orderDemoData)
            .catch(err => {
                console.log(err);
            })
    }

    app.telegram.sendMessage(`
        ${data.name}
        Symbol: ${data.symbol}
        Preço da ordem: ${currentPrice},
        Side: ${data.side}
    `)

    if( app.CHANNEL_BREAK ) app.logger(`CB: ${data.name}`, `${data.symbol}: ${currentPrice}`);
    return true
}

module.exports = channelBreak