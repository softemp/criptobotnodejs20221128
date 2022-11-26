const DB = require("./../src/db");
const { Model, DataTypes } = require("sequelize");
const sequelize = require("./../src/db");

module.exports = () => {
    const Settings = sequelize.define('Settings',
        {
            id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
            telegramBot: { type: DataTypes.STRING },
            telegramToken: { type: DataTypes.STRING },
            telegramChat: { type: DataTypes.STRING },

            isActive: { type: DataTypes.TINYINT(1) },
        },
        { modelName: "Settings", tableName: "settings" }
    );
    return Settings
}