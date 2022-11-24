const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const SymbolPermissions = sequelize.define('SymbolPermissions',
    {
        id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
        symbolId: { type: DataTypes.BIGINT },
        filterSymbolType: { type: DataTypes.ENUM(['SPOT', 'FUTURE']) },

        permission: { type: DataTypes.TEXT },
    },
        { modelName: "SymbolPermissions", tableName: "symbolPermissions" }
    );

    SymbolPermissions.associate = function (models) {
        SymbolPermissions.belongsTo(models.Symbols, {
            foreingkey: 'symbolId',
            // as: 'Symbol'
        })
    }
    return SymbolPermissions
}
