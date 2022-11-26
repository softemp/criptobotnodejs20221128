const { Telegraf } = require("telegraf");
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
bot.launch();

exports.sendMessage = (message) => {
    bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message)
        .catch(err => {
            console.log(err);
            console.log("Erro ao enviar mensagem ao telegram. aguardando para reenvio.");
            setTimeout(() => {
                this.sendMessage(message)
            }, 5000);
        })
};
