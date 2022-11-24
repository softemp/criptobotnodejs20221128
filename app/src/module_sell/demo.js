let data = []
let blocked = false
let ordersP = false
module.exports = app => {
    updateOrders()
    app.events.on("monitor:prices", async (p) => {
        data = p
        process()
    })

    async function process() {
        if (!blocked && ordersP) {
            blocked = true
            for (const order of ordersP) {
                ordersP.splice(ordersP.indexOf(order), 1)
                const automation = await app.DB.models.Strautomations.findOne({ raw: true, where: { id: order.automationId } })

                //preço orden de entrda
                const entryOrderPrice = parseFloat(order.price)
                let tpPriceOrder;
                //gerar orden TP
                if (automation) {
                    let isBreakEven = automation.breakEven;

                    if (automation.tpConditions.indexOf("PORCENT") !== -1) {
                        let porcentGet = automation.tpConditions.split("*")[1]
                        let porcent = porcentGet;
                        tpPriceOrder = (order.side == 'BUY' ? entryOrderPrice * porcent : entryOrderPrice / porcent);

                        //start calculo do break even
                        let valorBreak;
                        if (automation.breakEven) {
                            console.log("ENTRANDO NO BREAKEVEN: ");

                            //obtendo diferença entre TP(alvo) entre a posição de entrada (entryOrderPrice)
                            let diferenca = (order.side == 'BUY' ? entryOrderPrice - tpPriceOrder : tpPriceOrder - entryOrderPrice );


                            console.log("tpPriceOrder alvo: ", tpPriceOrder);
                            console.log("entryOrderPrice posição entrada: ", entryOrderPrice);
                            console.log("diferença entre alvo e entrada: ", diferenca);
                            if (order.side == 'BUY') {
                                valorBreak = (entryOrderPrice - ((diferenca * automation.beConditions) - diferenca));
                            } else {
                                valorBreak = (entryOrderPrice + ((diferenca * automation.beConditions) - diferenca));
                            }
                            console.log("Valor BREAK Even: ", valorBreak);
                        }
                        //end calculo do break even

                        let orderDemoData = {
                            orderDemoId: order.id,
                            traderId: order.traderId,
                            automationId: order.automationId,
                            entryType: 'SIGNAL',
                            symbol: order.symbol,
                            orderId: Math.floor(Date.now() * Math.random()),
                            clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
                            transactTime: Date.now(),
                            type: 'LIMIT',
                            side: (order.side == 'BUY') ? 'SELL' : 'BUY',
                            status: 'NEW',
                            price: parseFloat(tpPriceOrder.toFixed(8)),
                            origQty: 0.001,
                            quantity: 0.001,
                            orderType: 'TP',
                            isBreakEven: isBreakEven,
                            breakEven: parseFloat(valorBreak),
                            positionPrice: entryOrderPrice,
                            comment: 'Bot Working',
                            isWorking: true,
                        }
                        // console.info('process TP', orderDemoData);
                        await app.DB.models.BotOrderDemos.update({ isWorking: 0 }, { where: { id: order.id } })
                        await app.DB.models.BotOrderDemos.create(orderDemoData, { include: [{ model: app.DB.models.BotOrderDemos }] })
                        app.telegram.sendMessage(`Ordem TP Criada ${tpPriceOrder.toFixed(2)} porcent ${porcent}`)
                    }

                    //gerar orden SL
                    if (automation.slConditions.indexOf("PORCENT") !== -1) {
                        let porcentGet = automation.slConditions.split("*")[1]
                        let porcent = porcentGet;
                        let slPriceOrder = (order.side == 'BUY' ? entryOrderPrice / porcent : entryOrderPrice * porcent);

                        //start calculo do break even
                        let valorBreak;
                        if (automation.breakEven) {
                            console.log("ENTRANDO NO BREAKEVEN: ");

                            //obtendo diferença entre TP(alvo) entre a posição de entrada (entryOrderPrice)
                            let diferenca = (order.side == 'BUY' ? tpPriceOrder - entryOrderPrice : entryOrderPrice - tpPriceOrder );


                            console.log("tpPriceOrder alvo: ", tpPriceOrder);
                            console.log("entryOrderPrice posição entrada: ", entryOrderPrice);
                            console.log("diferença entre alvo e entrada: ", diferenca);
                            if (order.side == 'BUY') {
                                valorBreak = (entryOrderPrice + ((diferenca * automation.beConditions) - diferenca));
                            } else {
                                valorBreak = (entryOrderPrice - ((diferenca * automation.beConditions) - diferenca));
                            }
                            console.log("Valor BREAK Even: ", valorBreak);
                        }
                        //end calculo do break even

                        let orderDemoData = {
                            orderDemoId: order.id,
                            traderId: order.traderId,
                            automationId: order.automationId,
                            entryType: 'SIGNAL',
                            symbol: order.symbol,
                            orderId: Math.floor(Date.now() * Math.random()),
                            clientOrderId: Math.floor(Date.now() * Math.random()).toString(35),
                            transactTime: Date.now(),
                            type: 'LIMIT',
                            side: (order.side == 'BUY') ? 'BUY' : 'SELL',
                            status: 'NEW',
                            price: parseFloat(slPriceOrder.toFixed(8)),
                            origQty: 0.001,
                            quantity: 0.001,
                            orderType: 'SL',
                            isBreakEven: isBreakEven,
                            breakEven: parseFloat(valorBreak),
                            positionPrice: entryOrderPrice,
                            comment: 'Bot Working',
                            isWorking: true,
                        }
                        // console.log('process SL', orderDemoData);
                        await app.DB.models.BotOrderDemos.update({ isWorking: 0 }, { where: { id: order.id } })
                        await app.DB.models.BotOrderDemos.create(orderDemoData, { include: [{ model: app.DB.models.BotOrderDemos }] })
                        app.telegram.sendMessage(`Ordem SL Criada ${slPriceOrder.toFixed(2)} porcent ${porcent}`);
                    }
                }
            }
            blocked = false
        }
    }

    async function updateOrders(){
        ordersP = await app.DB.models.BotOrderDemos.findAll({ raw: true, where: { isWorking: true, status: 'FILLED' } })
        setTimeout(() => {
            updateOrders()
        }, 2000);
    }
}