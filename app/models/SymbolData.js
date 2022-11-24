const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const SymbolData = sequelize.define('SymbolData',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        symbolId: { type: DataTypes.BIGINT },
        filterSymbolType: { type: DataTypes.ENUM(['SPOT', 'FUTURE']) },

        baseAsset: { type: DataTypes.TEXT },
        baseAssetPrecision: { type: DataTypes.TEXT },
        quoteAsset: { type: DataTypes.TEXT },
        quotePrecision: { type: DataTypes.TEXT },

        quoteAssetPrecision: { type: DataTypes.TEXT },
        baseCommissionPrecision: { type: DataTypes.TEXT },
        quoteCommissionPrecision: { type: DataTypes.TEXT },
        icebergAllowed: { type: DataTypes.TINYINT(1) },
        ocoAllowed: { type: DataTypes.TINYINT(1) },
        quoteOrderQtyMarketAllowed: { type: DataTypes.TINYINT(1) },
        allowTrailingStop: { type: DataTypes.TINYINT(1) },
        cancelReplaceAllowed: { type: DataTypes.TINYINT(1) },
        isSpotTradingAllowed: { type: DataTypes.TINYINT(1) },
        isMarginTradingAllowed: { type: DataTypes.TINYINT(1) },

        pair: { type: DataTypes.TEXT },
        contractType: { type: DataTypes.TEXT },
        deliveryDate: { type: DataTypes.TEXT },
        onboardDate: { type: DataTypes.TEXT },
        maintMarginPercent: { type: DataTypes.DECIMAL(18, 8) },
        requiredMarginPercent: { type: DataTypes.DECIMAL(18, 8) },
        marginAsset: { type: DataTypes.TEXT },
        pricePrecision: { type: DataTypes.TEXT },
        quantityPrecision: { type: DataTypes.TEXT },
        underlyingType: { type: DataTypes.TEXT },
        settlePlan: { type: DataTypes.TEXT },
        triggerProtect: { type: DataTypes.DECIMAL(18, 8) },
        liquidationFee: { type: DataTypes.DECIMAL(18, 8) },
        marketTakeBound: { type: DataTypes.DECIMAL(18, 8) },
    },
        { modelName: "SymbolData", tableName: "symbolData" }
    );

    SymbolData.associate = function (models) {
        SymbolData.belongsTo(models.Symbols, {
            foreingkey: 'symbolId',
            // as: 'Symbol'
        })
    }
    return SymbolData
}
