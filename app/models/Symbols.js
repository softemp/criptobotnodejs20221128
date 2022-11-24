const DB = require("./../src/db");
const {Model, DataTypes} = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const Symbols = sequelize.define('Symbols',
        {
            id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
            exchangeId: {type: DataTypes.BIGINT},
            symbol: {type: DataTypes.TEXT},
            status: {type: DataTypes.TEXT},
            spot: {type: DataTypes.TINYINT(1)},
            future: {type: DataTypes.TINYINT(1)},

            // isFavorite: { type: DataTypes.TINYINT(1) },
            isActive: {type: DataTypes.TINYINT(1)},
        },
        {modelName: "Symbols", tableName: "symbols"}
    );
    return Symbols
}
