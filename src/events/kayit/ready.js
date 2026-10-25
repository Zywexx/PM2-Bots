const { Events, ActivityType } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
    name: Events.ClientReady || 'clientReady',
    once: true,
    async execute(client) {
        logger.info(`Kayıt Botu hazır! Giriş yapıldı: ${client.user.tag}`, 'KAYIT-BOT');
        logger.info(`${client.guilds.cache.size} sunucuda aktif olarak dinleniyor.`, 'KAYIT-BOT');

        // Bot durumu / presence
        client.user.setPresence({
            activities: [{ name: '787 INC By Zywexx', type: ActivityType.Watching }],
            status: 'online'
        });
    }
};
