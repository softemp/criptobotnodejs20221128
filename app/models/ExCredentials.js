const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");

class Symbols extends Model { }

Symbols.init(
    {
        id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
        exchangeId: { type: DataTypes.BIGINT },
        traderId: { type: DataTypes.BIGINT, allowNull: true },
        clientId: { type: DataTypes.BIGINT, allowNull: true },
        accessKey: { type: DataTypes.TEXT },
        secretKey: { type: DataTypes.TEXT },
        statusBotSpot: { type: DataTypes.BOOLEAN },
        // futuresKey: { type: DataTypes.TEXT, allowNull: true },
        // futuresSecret: { type: DataTypes.TEXT, allowNull: true },
        // statusBotFutures: { type: DataTypes.TINYINT },
        enableReading: { type: DataTypes.TINYINT },
        ipRestrict: { type: DataTypes.TINYINT },
        enableSpotAndMarginTrading: { type: DataTypes.TINYINT },
        enableWithdrawals: { type: DataTypes.TINYINT },
        enableInternalTransfer: { type: DataTypes.TINYINT },
        enableMargin: { type: DataTypes.TINYINT },
        enableFutures: { type: DataTypes.TINYINT },
        permitsUniversalTransfer: { type: DataTypes.TINYINT },
        enableVanillaOptions: { type: DataTypes.TINYINT },
    },
    { sequelize: DB, modelName: "ExCredentials", tableName: "exCredentials" }
);