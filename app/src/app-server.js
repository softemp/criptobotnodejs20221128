module.exports = async ( app ) => {
    // iniciando serviços
    app.DB = require("./db.js");
    app.logger = require("./utils/logger");
    app.redis = require("./redis");
    app.telegram = require("./utils/telegram");
    app.exchange = require("./utils/exchange")(app);
    app.indexes = require("./indexes");
    app.process_automation = require("./process_automation")(app)
    app.CHANNEL_BREAK = process.env.CHANNEL_BREAK === 'true';
    app.symbolFilters = require("./utils/symbolFilters")(app)

    // Carregando relacionamentos de tabelas
    for ( const model in app.DB.models ) {
        if( app.DB.models[model].associate ) {
            app.DB.models[model].associate(app.DB.models)
        }
    }

    // Iniciando serviços autônomos
    require('./demo_market/order_monitor')(app)
    require('./module_sell/demo')(app)
    require('./utils/monitor-orders')(app)
    // Fim da inicialização dos serviços

    const ChannelBreak = require('./special_automations/channel_break')
    let signals = []
    let blocked = true
    const initMon = []

    //carregando monitores do systema
    // const systemMonitors = await app.DB.models.Strmonitors.findAll({
    //     where: {
    //         isActive: true,
    //         exCredentialId: null
    //         // type: "CANDLES",
    //     },
    // });
    //
    // const tickerMonitor = systemMonitors.find(m => m.dataValues.type === 'TICKER');
    // if (tickerMonitor) {
    //     console.log('monitors app-server 44 =========: ',`${tickerMonitor.broadcastLabel}`)
    //     console.log('monitors app-server 45 =========: ',`${tickerMonitor.indexes}`)
    //     // startTickerMonitor(tickerMonitor.id, tickerMonitor.broadcastLabel, tickerMonitor.logs);
    // }

    const dataDbindicators = await app.DB.models.Indicators.findAll({ raw: true });

    //carregando os monitores dos traders
    const userMonitors = await app.DB.models.Strmonitors.findAll({
        where: {
            isActive: true,
            // exCredentialId: null
            type: "CANDLES",
            // isSystemMon: null
        },
    });

    userMonitors.map(async ( m ) => {
        const data = m.dataValues;
        app.redis.set(
            `MONITORS:${data.id}:${data.symbol}:${data.interval}`,
            `${data.indexes}`
        );
        app.logger(
            "M",
            `MONITORS:${data.id}:${data.symbol}:${data.interval} ${data.indexes}`
        );
        app.exchange.fsubscribe(data.symbol, data.interval);
    });

    const automations = await app.DB.models.Strautomations.findAll({
        raw: true,
        where: { isActive: 1, entryType: "SIGNAL" },
    });

    //temos que validar o numero de automações ativar na mesmo PAR para o mesmo usuario
    // console.log('numero de automações: ', automations.length)

    app.events.on("newCandle", async ( data ) => {
        await updateMemory(data)

        //name para verificar se é channel break
        let indexesPart = `${data.s}:CHANNEL-BREAK`
        // console.log('Result: ',await app.redis.getAll())
        // return false
        signals = []
        for ( const automation of automations ) {

            //verificando se é channel break com a mesma moeda e com o mesmo time freme
            if( automation.conditions.indexOf(indexesPart) !== - 1 && automation.conditions.indexOf(data.i) !== - 1 ) {
                const channel = await automation.conditions.indexOf("min") !== - 1 ? 'min' : 'max'
                const indicatiors = automation.indexes.split(',');
                const indexes = indicatiors.filter(e => e.indexOf(indexesPart) !== - 1)
                const monitorData = JSON.parse(await app.redis.get(indexes[0]))
                // console.log('indexes: ',indexes[0]);
                // console.log('monitorData: ',monitorData);
                // console.log('channel: ',channel);
                if (!monitorData){
                    app.logger('M', `Alerta app-server linha 98: Monitor ${indexes[0]} não carregado.`);
                    return false
                }
                const currentPrice = monitorData['current'][channel]
                // console.log('Result: ',currentPrice);

                // console.log('Cancelando o envio de ordem app-server 98: ',currentPrice);
                // return false
                await ChannelBreak(app, automation, currentPrice)
            }
        }
    });

    app.events.on("monitor:prices", async ( data ) => {

        if( !initMon.find(i => i.symbol === data.s && i.tf === data.i) ) {
            initMon.push({ symbol: data.s, tf: data.i })
            // await updateMemory(data)
        }

        await app.redis.set(`${data.s}:CURRENT-PRICE_${data.i}`, JSON.stringify({ current: parseFloat(data.c) }));
        for ( const automation of automations ) {
            if( automation.conditions.indexOf("CHANNEL-BREAK") !== - 1 ) {
                // ChannelBreak(app, automation)
            } else {
                if( blocked === false && !signals.find(s => s === automation.id) ) {
                    const indexes = automation.indexes.split(",")
                    if( !indexes[indexes.length - 1] ) indexes.pop()
                    const MEMORY = await app.redis.getAllKeys(...indexes);
                    const invertedCondition = invertCondition(indexes, automation.conditions);
                    const evalCondition = automation.conditions + (invertedCondition ? ' && ' + invertedCondition : '');
                    const isValid = evalCondition ? Function("MEMORY", "return " + evalCondition)(MEMORY) : false;
                    if( await isValid ) {
                        app.events.emit('automation:true', automation)
                        signals.push(automation.id)
                    }
                }
            }
        }
    });

    async function updateMemory( data ) {
        blocked = true
        await app.redis.set(`${data.s}:${data.i}:PREVIOUS`, JSON.stringify(data));
        app.logger("updateMemory", `${data.s}:${data.i}:PREVIOUS ${JSON.stringify(data)}`);

        //pegando os 500 candles do symbo: data.s com o timeframe: data.i
        const history = await app.exchange.fcandles(data.s, data.i);
        //adicionando os 500 candles no redis
        await app.redis.set(`${data.s}:${data.i}:CANDLES`, JSON.stringify(history));
        app.logger("updateMemory", `${data.s}:${data.i}:CANDLES [SALVO NA MEMÓRIA OS ULTIMOS 500 CANDLES FECHADOS]`);

        //adicionando o preço a tual no redis
        await app.redis.set(`${data.s}:${data.i}`, JSON.stringify({ current: history[history.length - 1][4] }))
        app.logger("updateMemory", `${data.s}:${data.i} current:${history[history.length - 1][4]}`)

        const monitors = await app.redis.getAll();

        const monitorsFilterd = monitors.filter(( key ) => {
            return key.split(":")[0] === "MONITORS" && key.split(":")[2] === data.s && key.split(":")[3] === data.i;
        });

        for ( const key of monitorsFilterd ) {

            const dataf = await app.redis.get(key);

            const dataSplit = dataf.split(",");

            for ( const ind of dataSplit ) {

                const indSplit = ind.split("_");
                const indDb = dataDbindicators.find(
                    ( e ) => e.slug === indSplit[0]
                ).indicator;

                // const indicador = `${data.s}:${ind}_${data.i}`;
                // const indicadorData = await app.redis.get(indicador);
                // console.log('indicador 4 =========: ',`${indicadorData}`)

                const monitorData = await app.indexes[indDb](
                    history,
                    indSplit.filter(( e, i ) => i > 0)
                );

                app.redis.set(
                    `${data.s}:${ind}_${data.i}`,`${JSON.stringify(monitorData)}`
                );

                app.logger(
                    "updateMemory",
                    `${data.s}:${ind}_${data.i} ${JSON.stringify(monitorData)}`
                );
            }
        }
        setTimeout(() => {
            blocked = false
        }, 5000);
    }
};

function invertCondition( memoryKey, conditions ) {
    const conds = conditions.split(' && ');
    const ret = conds.map(condToInvert => {
        if( condToInvert.indexOf('CHANNEL-BREAK') !== - 1 ) return false
        if( condToInvert.indexOf('>=') !== - 1 ) return condToInvert.replace('>=', '<').replace(/current/g, 'previous');
        if( condToInvert.indexOf('<=') !== - 1 ) return condToInvert.replace('<=', '>').replace(/current/g, 'previous');
        if( condToInvert.indexOf('>') !== - 1 ) return condToInvert.replace('>', '<').replace(/current/g, 'previous');
        if( condToInvert.indexOf('<') !== - 1 ) return condToInvert.replace('<', '>').replace(/current/g, 'previous');
        if( condToInvert.indexOf('!') !== - 1 ) return condToInvert.replace('!', '=').replace(/current/g, 'previous');
        if( condToInvert.indexOf('==') !== - 1 ) return condToInvert.replace('==', '!=').replace(/current/g, 'previous');
        return false;
    })
    let returnCondition = ''
    for ( const cond of ret ) {
        if( !returnCondition ) {
            returnCondition = cond
        } else {
            returnCondition = `${returnCondition} && ${cond}`
        }
    }
    return returnCondition
}