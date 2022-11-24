const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");

class Indicators extends Model { }

Indicators.init(
  {
    id: {type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true},
    name: { type: DataTypes.TEXT },
    slug: { type: DataTypes.TEXT },
    slug1: { type: DataTypes.TEXT },
    indicator: { type: DataTypes.TEXT },
    returnKeys: { type: DataTypes.TEXT },
    description: { type: DataTypes.TEXT },
    isActive: { type: DataTypes.BOOLEAN },
  },
  { sequelize: DB, modelName: "Indicators", tableName: "strIndicators" }
);
