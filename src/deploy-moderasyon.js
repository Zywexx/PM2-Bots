require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commands = [];
const folders = ['moderasyon', 'genel'];

for (const folder of folders) {
    const folderPath = path.join(__dirname, 'commands', folder);
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            }
        }
    }
}

const token = process.env.MOD_BOT_TOKEN || process.env.DISCORD_TOKEN;
const clientId = process.env.MOD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
    logger.error('Eksik bilgi: MOD_BOT_TOKEN/DISCORD_TOKEN, MOD_CLIENT_ID/DISCORD_CLIENT_ID ve DISCORD_GUILD_ID gereklidir.', 'DEPLOY-MOD');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        logger.info(`${commands.length} adet Moderasyon & Genel (/) komutu Discord API'ye yükleniyor...`, 'DEPLOY-MOD');

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        logger.info(`${data.length} adet Moderasyon komutu başarıyla yüklendi!`, 'DEPLOY-MOD');
    } catch (error) {
        logger.error(`Moderasyon komutları yüklenirken hata oluştu: ${error}`, 'DEPLOY-MOD', error);
    }
})();
