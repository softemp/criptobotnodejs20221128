let orders = false
module.exports = async (app) => {
    updateOrdersData() //Iniciando o update de ordens do banco

    // app.events.on("newCandle", async (data) => {
        // orders = await app.DB.models.BotOrderDemos.findAll({ raw: true, where: { isWorking: true, status: 'NEW' } })
    // });

    app.events.on("monitor:prices", async (data) => {
        // orders = await app.DB.models.BotOrderDemos.findAll({ raw: true, where: { isWorking: true, status: 'NEW' } })

        if (orders) {

            const ordersSymbol = orders.filter(o => o.symbol == data.s)
            ordersSymbol.forEach( async element => {

                // console.log('order DE PRICE: ', parseFloat(element.price).toFixed(1));
                // console.log('merca DE PRICE: ', parseFloat(data.c).toFixed(1));

                let currentPrice = parseFloat(data.c).toFixed(1);
                let orderPrice = parseFloat(element.price).toFixed(1);

                if (data.c >= element.price && element.side === 'SELL' && (element.orderType === 'TP' || element.orderType === 'SL')) {

                    let orderType = (element.orderType === 'TP' ? 'SL' : 'TP');

                    await app.DB.models.BotOrderDemos.update({ status: 'FILLED', isWorking: false }, { where: { id: element.id } })
                        .then(async res=>{

                            app.telegram.sendMessage(`Ordem de saida ${element.id} - ${element.orderDemoId} - ${element.orderType} executada ${parseFloat(element.price).toFixed(1)}`)
                            // console.log('mercado maior que preço das ordens: ', element.id)
                            await app.DB.models.BotOrderDemos.destroy({
                                where: {
                                    status: 'NEW',
                                    orderType: orderType,
                                    orderDemoId: element.orderDemoId
                                }
                            })
                            .then((res)=> {
                                app.telegram.sendMessage(`Ordem de saida ${element.id} ${orderType} removida`)
                            })
                     })
                        .catch(e =>{
                        app.logger('OM: UpdateOrder', `Order: ${element.id} type: ${element.orderType} erro: ${e}`)
                    })

                } else if (data.c <= element.price && element.side === 'BUY' && (element.orderType === 'TP' || element.orderType === 'SL')) {

                    let orderType = (element.orderType === 'TP' ? 'SL' : 'TP');

                    await app.DB.models.BotOrderDemos.update({ status: 'FILLED', isWorking: false }, { where: { id: element.id } })
                        .then(async res=>{

                        app.telegram.sendMessage(`Ordem de saida ${element.id} - ${element.orderDemoId} - ${element.orderType} executada ${parseFloat(element.price).toFixed(1)}`)
                        // console.log('mercado menor que preço das ordens: ', element.id)
                        await app.DB.models.BotOrderDemos.destroy({
                            where: {
                                status: 'NEW',
                                orderType: orderType,
                                orderDemoId: element.orderDemoId
                            }
                        })
                        app.telegram.sendMessage(`Ordem de saida ${element.id} ${orderType} removida`)
                    })
                        .catch(e =>{
                            app.logger('OM: UpdateOrder', `Order: ${element.id} type: ${element.orderType} erro: ${e}`)
                        })
                }

                //se encontrar uma ordem com o preço atual
                if (currentPrice == orderPrice) {

                    if (!element.orderDemoId) {
                        await app.DB.models.BotOrderDemos.update({ status: 'FILLED' }, { where: { id: element.id } })
                            .then((res)=> {
                            // console.log(`Ordem ${element.id} executada ${element.price}`);
                            app.telegram.sendMessage(`Ordem de entrada ${element.id} executada ${parseFloat(element.price).toFixed(1)}`)
                        })
                    }
                }

                // breakEven(orders, data);

                // const ordersSymbol1 = orders.filter(o => o.symbol == data.s && o.orderType === 'SL' && o.price !== o.positionPrice && o.status !== 'FILLED')
                // ordersSymbol1.forEach( async element => {
                //     //start verificar se ha breakeven
                //     if (element.side==='SELL' && element.breakEven >= element.positionPrice){
                //         app.telegram.sendMessage(`Modulo BreakEven SELL: ${element.id} Bre ${element.breakEven} position: ${element.positionPrice} alvo: ${element.price}`)
                //         await app.DB.models.BotOrderDemos.update({ price: element.positionPrice }, { where: { id: element.id } })
                //     }
                //     else if (element.side==='BUY' && element.breakEven <= element.positionPrice){
                //         app.telegram.sendMessage(`Modulo BreakEven BUY: ${element.id} Bre ${element.breakEven} position: ${element.positionPrice} alvo: ${element.price}`)
                //         await app.DB.models.BotOrderDemos.update({ price: element.positionPrice }, { where: { id: element.id } })
                //     }
                //     //end verificar se ha breakeven
                // })

                breakEven1(element, data);
            });

            // breakEven(orders, data);
        }
    });

    async function updateOrdersData() {
        orders = await app.DB.models.BotOrderDemos.findAll({ raw: true, where: { isWorking: true, status: 'NEW' } })
        setTimeout(() => {
            updateOrdersData()
        }, 3000);
    }

    //start verificar se ha breakeven
    async function breakEven1(element, data){
        if (element.isBreakEven == true && element.status != 'FILLED'){

            let breakPrice = parseFloat(element.breakEven).toFixed(1);
            // console.log("TESTEANDJFKKKFKFKFKKFKKFKFKF: "+ breakPrice, data.c);

            //start verificar se ha breakeven
            if (element.side==='SELL' && data.c >= breakPrice && element.orderType == 'TP'){

                await app.DB.models.BotOrderDemos.update({
                    price: element.positionPrice,
                    isBreakEven: false,
                    // breakEven: null
                }, {where: {orderType: 'SL', isBreakEven: true}
                })
                    // }, {where: {orderType: 'SL', breakEven: { [DB.Op.ne]: 0}}})
                    .then(res => {
                        app.DB.models.BotOrderDemos.update({
                            isBreakEven: false,
                            // breakEven: null
                        }, {where: {orderType: 'TP', isBreakEven: true}})
                        app.telegram.sendMessage(`BreakEven Ativado SELL: ${element.id} position: ${element.positionPrice} Bre ${element.breakEven}  alvo: ${element.price}`)
                    })
            }
            else if (element.side==='BUY' && data.c <= breakPrice && element.orderType == 'TP'){

                await app.DB.models.BotOrderDemos.update({
                    price: element.positionPrice,
                    isBreakEven: false,
                    // breakEven: null
                }, {where: {orderType: 'SL', isBreakEven: true}
                })
                    .then(res => {
                        app.DB.models.BotOrderDemos.update({
                            isBreakEven: false,
                            // breakEven: null
                        }, {where: {orderType: 'TP', isBreakEven: true}})
                        app.telegram.sendMessage(`BreakEven Ativado BUY: ${element.id} position: ${element.positionPrice} Bre ${element.breakEven} alvo: ${element.price}`)
                    })
            }
            //end verificar se ha breakeven
        }
    }
    //end verificar se ha breakeven

    //start verificar se ha breakeven
    async function breakEven(orders, data){
        const ordersSymbol1 = orders.filter(o => o.isBreakEven == true)
        // const ordersSymbol1 = orders.filter(o => o.symbol == data.s && o.price !== o.positionPrice && o.status !== 'FILLED' && o.isBreakEven == true)
        ordersSymbol1.forEach( async element => {
            //start verificar se ha breakeven
            if (element.side==='SELL' && data.c >= element.breakEven && element.orderType === 'TP'){

                // if (element.breakEven > 0) {
                    // await app.DB.models.BotOrderDemos.update({ price: element.positionPrice }, { where: { id: element.id } })
                    await app.DB.models.BotOrderDemos.update({
                        price: element.positionPrice,
                        isBreakEven: false,
                        // breakEven: null
                    }, {where: {orderType: 'SL'}})
                    // }, {where: {orderType: 'SL', breakEven: { [Sequelize.Op.ne]: 0}}})
                        .then(res => {
                            app.DB.models.BotOrderDemos.update({
                                isBreakEven: false,
                                // breakEven: null
                            }, {where: {orderType: 'TP'}})
                            app.telegram.sendMessage(`BreakEven Ativado SELL: ${element.id} position: ${element.positionPrice} Bre ${element.breakEven}  alvo: ${element.price}`)
                        })
                // }
            }
            else if (element.side==='BUY' && data.c <= element.breakEven && element.orderType === 'TP'){

                // if (element.breakEven > 0) {
                    // await app.DB.models.BotOrderDemos.update({ price: element.positionPrice }, { where: { id: element.id } })
                    await app.DB.models.BotOrderDemos.update({
                        price: element.positionPrice,
                        isBreakEven: false,
                        // breakEven: null
                    }, {where: {orderType: 'SL'}})
                        .then(res => {
                            app.DB.models.BotOrderDemos.update({
                                isBreakEven: false,
                                // breakEven: null
                            }, {where: {orderType: 'TP'}})
                            app.telegram.sendMessage(`BreakEven Ativado BUY: ${element.id} position: ${element.positionPrice} Bre ${element.breakEven} alvo: ${element.price}`)
                        })
                // }

            }
            //end verificar se ha breakeven
        })
    }
    //end verificar se ha breakeven
}