const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");

class Strautomations extends Model { }

Strautomations.init(
  {
    id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
    exCredentialId: { type: DataTypes.BIGINT },
    notificationId: { type: DataTypes.BIGINT },
    name: { type: DataTypes.TEXT },
    strategyType: { type: DataTypes.ENUM(["BACKTEST", "DEMO", "DEV", "PROD"]) },
    market: { type: DataTypes.ENUM(["SPOT", "FUTURE"]) },
    side: { type: DataTypes.ENUM(["BUY", "SELL"]) },
    leverage: { type: DataTypes.TEXT },
    reduceOnly: { type: DataTypes.BOOLEAN },
    marginType: { type: DataTypes.ENUM(["CROSSED", "ISOLATED"]) },
    symbol: { type: DataTypes.TEXT },
      lote: { type: DataTypes.DECIMAL(18, 8) },
    indexes: { type: DataTypes.TEXT },
    entryType: { type: DataTypes.ENUM(["MANUAL", "SIGNAL"]) },
    conditions: { type: DataTypes.TEXT },
    exitType: { type: DataTypes.ENUM(["MANUAL", "SIGNAL"]) },
    takeProfit: { type: DataTypes.BOOLEAN },
    tpConditions: { type: DataTypes.TEXT },
    stopLoss: { type: DataTypes.BOOLEAN },
    slConditions: { type: DataTypes.TEXT },
    tralingStop: { type: DataTypes.BOOLEAN },
    tsConditions: { type: DataTypes.TEXT },
    breakEven: { type: DataTypes.BOOLEAN },
    beConditions: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN },
    logs: { type: DataTypes.BOOLEAN },
  },
  { sequelize: DB, modelName: "Strautomations", tableName: "strAutomations" }
);
