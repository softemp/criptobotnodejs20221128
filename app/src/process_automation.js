const logger = require('../src/utils/logger');
module.exports = async app => {
    app.events.on('automation:true', data => {
        // console.log(data);

        switch (data.strategyType) {
            case 'BACKTEST':

                break;
            case 'DEMO':
                newOrderDemo(data)
                break;
            case 'DEV':

                break;
            case 'PROD':

                break;
        }
    })

    async function newOrderDemo(data) {
        if (data.conditions.indexOf("CHANNEL-BREAK") !== -1) processChannelBreak(data)

        const cred = await app.DB.models.ExCredentials.findOne({ raw: true, where: { id: data.exCredentialId } })
        const orderDemoData = {
            traderId: cred.traderId,
            automationId: data.id,
            entryType: 'SIGNAL',
            symbol: data.symbol,
            orderId: Math.floor(Date.now() * Math.random()).toString(36),
            clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
            transactTime: Date.now(),
            type: 'LIMIT',
            side: data.side,
            status: '',
            price: '0.001',
            origQty: '',
            quantity: '',
            comment: 'Bot Working',
            isWorking: true,
        }
        // console.log(cred);
    }

    async function processChannelBreak(data) {
        const cred = await app.DB.models.ExCredentials.findOne({ raw: true, where: { id: data.exCredentialId, statusBotFutures: true } })
        const mm = await data.conditions.indexOf("min") !== -1 ? 'min' : 'max'
        const k = await app.redis.getAll()
        const kc = k.filter(e => e.indexOf("CHANNEL-BREAK") !== -1)
        const cb = JSON.parse(await app.redis.get(kc[0]))
        const dispPrice = cb['current'][mm]
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
            status: 'FILLED',
            price: dispPrice,
            origQty: 0.001,
            quantity: 0.001,
            comment: 'Bot Working',
            isWorking: true,
        }
        console.log('orderDemoData', orderDemoData);
        const orderDemos = await app.DB.models.BotOrderDemos.findAll({ raw: true, where: { traderId: cred.traderId, isWorking: true } })
        console.log('orderDemos.length', orderDemos.length);
        if (orderDemos.length == 0) {
            app.DB.models.BotOrderDemos.create(orderDemoData)
                .then(response => {
                    app.logger('PA:' + cred.traderId, response)
                })
                .catch(err => {
                    console.log(err);
                    app.logger('M:' + cred.traderId, err)
                })
        }

        app.telegram.sendMessage(`
        ${data.name}
        Symbol: ${data.symbol}
        Preço da ordem: ${dispPrice},
        Side: ${data.side}
        `)
        app.logger('PA: DISPARO DE ORDEM' + data.name, data.symbol)
        // logger('hydra', `Hydra memory updated: ${data.name} => ${data.symbol}, executeAutomations? ${dispPrice}`);
    }
}