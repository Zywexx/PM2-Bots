require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commands = [];
const kayitPath = path.join(__dirname, 'commands', 'kayit');

if (fs.existsSync(kayitPath)) {
    const files = fs.readdirSync(kayitPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(kayitPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        }
    }
}

const token = process.env.KAYIT_BOT_TOKEN || process.env.DISCORD_TOKEN;
const clientId = process.env.KAYIT_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId || !guildId) {
    logger.error('Eksik bilgi: KAYIT_BOT_TOKEN/DISCORD_TOKEN, KAYIT_CLIENT_ID/DISCORD_CLIENT_ID ve DISCORD_GUILD_ID gereklidir.', 'DEPLOY-KAYIT');
    process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        logger.info(`${commands.length} adet Kayıt (/) komutu Discord API'ye yükleniyor...`, 'DEPLOY-KAYIT');

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        logger.info(`${data.length} adet Kayıt komutu başarıyla yüklendi!`, 'DEPLOY-KAYIT');
    } catch (error) {
        logger.error(`Kayıt komutları yüklenirken hata oluştu: ${error}`, 'DEPLOY-KAYIT', error);
    }
})();
