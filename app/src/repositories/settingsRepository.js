let settings = function SettingsRepository(app){
    if (!new.target) return new SettingsRepository(app);
    return {
        getSettings: async (id) => {
            return await app.DB.models.Settings.findOne({ where: { id } })
        },
        getDefaultSettings: async () => {
            console.log('Settings', await app.DB.models.Settings.findAll({ raw: true }));
            return await app.DB.models.Settings.findOne({ where: { isActive: 1 } });

            // return await app.DB.models.Settings.findAll({ where: { isActive: true } })[0]
        }
    }
}

module.exports = settings
