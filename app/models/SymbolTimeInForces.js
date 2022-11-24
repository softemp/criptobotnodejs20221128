const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const SymbolTimeInForces = sequelize.define('SymbolTimeInForces',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        symbolId: { type: DataTypes.BIGINT },
        filterSymbolType: { type: DataTypes.ENUM(['SPOT', 'FUTURE']) },

        timeInForce: { type: DataTypes.TEXT },
    },
        { modelName: "SymbolTimeInForces", tableName: "symbolTimeInForces" }
    );

    SymbolTimeInForces.associate = function (models) {
        SymbolTimeInForces.belongsTo(models.Symbols, {
            foreingkey: 'symbolId',
            // as: 'Symbol'
        })
    }
    return SymbolTimeInForces
}
