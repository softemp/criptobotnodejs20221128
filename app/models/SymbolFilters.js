const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
  const SymbolFilters = sequelize.define('SymbolFilters', {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    symbolId: { type: DataTypes.BIGINT },
    filterSymbolType: { type: DataTypes.ENUM(['SPOT', 'FUTURE']) },

    filterType: { type: DataTypes.TEXT },
    minPrice: { type: DataTypes.DECIMAL(18, 8) },
    maxPrice: { type: DataTypes.DECIMAL(18, 8) },
    tickSize: { type: DataTypes.DECIMAL(18, 8) },
    multiplierDecimal: { type: DataTypes.TEXT },
    multiplierUp: { type: DataTypes.DECIMAL(18, 8) },
    multiplierDown: { type: DataTypes.DECIMAL(18, 8) },
    avgPriceMins: { type: DataTypes.TEXT },
    minQty: { type: DataTypes.DECIMAL(18, 8) },
    maxQty: { type: DataTypes.DECIMAL(18, 8) },
    stepSize: { type: DataTypes.DECIMAL(18, 8) },
    notional: { type: DataTypes.TEXT },
    minNotional: { type: DataTypes.DECIMAL(18, 8) },
    applyToMarket: { type: DataTypes.TEXT },
    limit: { type: DataTypes.TEXT },
    minTrailingAboveDelta: { type: DataTypes.TEXT },
    maxTrailingAboveDelta: { type: DataTypes.TEXT },
    minTrailingBelowDelta: { type: DataTypes.TEXT },
    maxTrailingBelowDelta: { type: DataTypes.TEXT },
    maxNumOrders: { type: DataTypes.TEXT },
    maxNumAlgoOrders: { type: DataTypes.TEXT },
  }, { modelName: "SymbolFilters", tableName: "symbolFilters" })

  SymbolFilters.associate = function (models) {
    SymbolFilters.belongsTo(models.Symbols, {
      foreingkey: 'symbolId',
      // as: 'Symbol'
    })
  }

  return SymbolFilters
}


// class SymbolFilters extends Model { }

// SymbolFilters.init(
//   {
//     id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
//     symbolId: { type: DataTypes.BIGINT },
//     filterType: { type: DataTypes.TEXT },
//     minPrice: { type: DataTypes.TEXT },
//     maxPrice: { type: DataTypes.TEXT },
//     tickSize: { type: DataTypes.TEXT },
//     multiplierUp: { type: DataTypes.TEXT },
//     multiplierDown: { type: DataTypes.TEXT },
//     avgPriceMins: { type: DataTypes.TEXT },
//     minQty: { type: DataTypes.TEXT },
//     maxQty: { type: DataTypes.TEXT },
//     stepSize: { type: DataTypes.TEXT },
//     minNotional: { type: DataTypes.TEXT },
//     applyToMarket: { type: DataTypes.TEXT },
//     limit: { type: DataTypes.TEXT },
//     minTrailingAboveDelta: { type: DataTypes.TEXT },
//     maxTrailingAboveDelta: { type: DataTypes.TEXT },
//     minTrailingBelowDelta: { type: DataTypes.TEXT },
//     maxTrailingBelowDelta: { type: DataTypes.TEXT },
//     maxNumOrders: { type: DataTypes.TEXT },
//     maxNumAlgoOrders: { type: DataTypes.TEXT },
//   },
//   { sequelize: DB, modelName: "SymbolFilters", tableName: "symbolFilters" }
// );