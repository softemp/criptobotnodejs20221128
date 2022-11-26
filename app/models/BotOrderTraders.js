const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
class BotOrderTraders extends Model {}

BotOrderTraders.init(
    {
        id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
        traderId: { type: DataTypes.BIGINT },
        automationId: { type: DataTypes.BIGINT },
        exCredentialId: { type: DataTypes.BIGINT },
        orderTraderId: { type: DataTypes.BIGINT, allowNull: true },
        entryType: { type: DataTypes.ENUM(['MANUAL', 'SIGNAL']) },
        orderId: { type: DataTypes.BIGINT },
        symbol: { type: DataTypes.TEXT },
        status: { type: DataTypes.TEXT },
        clientOrderId: { type: DataTypes.TEXT },
        price: { type: DataTypes.DECIMAL(18, 8) },
        avgPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        origQty: { type: DataTypes.DECIMAL(18, 8) },
        executedQty: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        cumQty: { type: DataTypes.DECIMAL(18, 8) },
        cumQuote: { type: DataTypes.DECIMAL(18, 8) },
        timeInForce: { type: DataTypes.TEXT },
        type: { type: DataTypes.TEXT },
        reduceOnly: { type: DataTypes.BOOLEAN },
        closePosition:{type: DataTypes.BOOLEAN},
        side: { type: DataTypes.TEXT },
        positionSide: { type: DataTypes.TEXT, allowNull: true },
        stopPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        workingType: {type: DataTypes.TEXT, allowNull: true},
        // origClientOrderId: { type: DataTypes.TEXT, allowNull: true },
        // transactTime: { type: DataTypes.BIGINT },
        priceProtect: { type: DataTypes.TINYINT},
        origType: { type: DataTypes.TEXT, allowNull: true},
        priceRate: { type: DataTypes.TEXT, allowNull: true},
        activatePrice: { type: DataTypes.TEXT, allowNull: true},
        updateTime: { type: DataTypes.BIGINT, allowNull: true },

        isMaker:{type: DataTypes.BOOLEAN},
        commissionAsset: { type: DataTypes.TEXT, allowNull: true },
        commission: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        realizedProfit: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        cummulativeQuoteQty: { type: DataTypes.DECIMAL(18, 8), allowNull: true },

        net: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        obs: {type: DataTypes.TEXT, allowNull: true},
        orderType: { type: DataTypes.ENUM(['TP', 'SL']) },
        isWorking: { type: DataTypes.TEXT, allowNull: true },
    },
    {
        sequelize: DB,
        modelName: "BotOrderTraders",
        tableName: "botOrderTraders",
    },

);

BotOrderTraders.belongsTo(BotOrderTraders, { foreignKey: 'orderTraderId' })
