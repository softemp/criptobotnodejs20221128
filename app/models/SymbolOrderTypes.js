const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const SymbolOrderTypes = sequelize.define('SymbolOrderTypes',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        symbolId: { type: DataTypes.BIGINT },
        filterSymbolType: { type: DataTypes.ENUM(['SPOT', 'FUTURE']) },

        type: { type: DataTypes.TEXT },
    },
        { modelName: "SymbolOrderTypes", tableName: "symbolOrderTypes" }
    );

    SymbolOrderTypes.associate = function (models) {
        SymbolOrderTypes.belongsTo(models.Symbols, {
            foreingkey: 'symbolId',
            // as: 'Symbol'
        })
    }
    return SymbolOrderTypes
}
