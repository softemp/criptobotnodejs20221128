const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");

class BotOrderDemos extends Model { }

BotOrderDemos.init(
    {
        id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
        traderId: { type: DataTypes.BIGINT },
        automationId: { type: DataTypes.BIGINT },
        orderDemoId: { type: DataTypes.BIGINT, allowNull: true },
        entryType: { type: DataTypes.ENUM(['MANUAL', 'SIGNAL']) },
        symbol: { type: DataTypes.TEXT },
        orderId: { type: DataTypes.BIGINT },
        clientOrderId: { type: DataTypes.TEXT },
        origClientOrderId: { type: DataTypes.TEXT, allowNull: true },
        transactTime: { type: DataTypes.BIGINT },
        time: { type: DataTypes.BIGINT, allowNull: true },
        updateTime: { type: DataTypes.BIGINT, allowNull: true },
        entryType: { type: DataTypes.TEXT },
        side: { type: DataTypes.TEXT },
        status: { type: DataTypes.TEXT },
        timeInForce: { type: DataTypes.TEXT },
        price: { type: DataTypes.DECIMAL(18, 8) },
        origQty: { type: DataTypes.DECIMAL(18, 8) },
        executedQty: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        cummulativeQuoteQty: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        stopPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        icebergQty: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
        avgPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        commission: { type: DataTypes.TEXT, allowNull: true },
        quantity: { type: DataTypes.TEXT },
        reduceOnly: { type: DataTypes.BOOLEAN },
        positionSide: { type: DataTypes.TEXT, allowNull: true },
        activatePrice: { type: DataTypes.TEXT, allowNull: true },
        priceRate: { type: DataTypes.TEXT, allowNull: true },
        trailing: { type: DataTypes.BOOLEAN },
        takeProfit: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
        stopLoss: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
        // isBreakEven: { type: DataTypes.BOOLEAN },
        breakEven: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        trailingTakeProfit: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
        trailingStopLoss: { type: DataTypes.DOUBLE(8, 2), allowNull: true },
        orderType: { type: DataTypes.ENUM(['TP', 'SL']) },
        positionPrice: { type: DataTypes.DECIMAL(18, 8), allowNull: true },
        comment: { type: DataTypes.TEXT, allowNull: true },
        isWorking: { type: DataTypes.TEXT, allowNull: true },
        executedSameTime: { type: DataTypes.TEXT, allowNull: true },

    },
    {
        sequelize: DB,
        modelName: "BotOrderDemos",
        tableName: "botOrderDemos",
    },

);

BotOrderDemos.belongsTo(BotOrderDemos, { foreignKey: 'orderDemoId' })