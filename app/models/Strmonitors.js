const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");

class Strmonitors extends Model { }

Strmonitors.init(
  {
    id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
    symbol: { type: DataTypes.TEXT },
    type: { type: DataTypes.TEXT },
    broadcastLabel: { type: DataTypes.TEXT },
    interval: { type: DataTypes.TEXT },
    indexes: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN },
  },
  { sequelize: DB, modelName: "Strmonitors", tableName: "strMonitors" }
);
