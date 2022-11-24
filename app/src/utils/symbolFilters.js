let symbolFilters = {}
let SF =  function SymbolFilters (app){
    async function getSymbolFilter(symbol, automation) {
        if (symbolFilters[symbol]) return symbolFilters[symbol]
        const LOT_SIZEFilter = await app.DB.models.SymbolFilters.findOne({
            where: { filterType: 'LOT_SIZE', filterSymbolType: automation.market },
            include: [
                {
                    model: app.DB.models.Symbols,
                    where: {
                        symbol: automation.symbol,
                    }
                }
            ]
        })
        const PRICE_FILTERDb = await app.DB.models.SymbolFilters.findOne({
            where: { filterType: 'PRICE_FILTER', filterSymbolType: automation.market },
            include: [
                {
                    model: app.DB.models.Symbols,
                    where: {
                        symbol: automation.symbol,
                    }
                }
            ]
        })
        const stepSize = parseFloat(LOT_SIZEFilter.stepSize)
        // const minQty = parseFloat(LOT_SIZEFilter.minQty)
        const tickSize = parseFloat(PRICE_FILTERDb.tickSize)
        const data = {
            // LOT_SIZE: stepSize.toString().split('.')[1].length,
            LOT_SIZE: {
                stepSize: stepSize.toString().split('.')[1].length,
                minQty: parseFloat(LOT_SIZEFilter.minQty),
                maxQty: parseFloat(LOT_SIZEFilter.maxQty)
            },
            PRICE_FILTER: {
                tickSize: tickSize.toString().split('.')[1].length,
                minPrice: parseFloat(LOT_SIZEFilter.minPrice),
                maxPrice: parseFloat(LOT_SIZEFilter.maxPrice)
            }
        }
        symbolFilters[symbol] = data
        return data
    }

    return {
        getSymbolFilter
    }
}

module.exports = SF