require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFolders = fs.readdirSync(commandsPath);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        if (!fs.lstatSync(folderPath).isDirectory()) continue;

        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                logger.warn(`[UYARI] ${filePath} komutu 'data' veya 'execute' barındırmıyor.`);
            }
        }
    }
} else {
    logger.warn('Komutlar klasörü (src/commands) bulunamadı. Dağıtılacak komut yok.');
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        logger.info(`${commands.length} adet uygulama (/) komutu Discord API'ye yükleniyor...`);

        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands }
        );

        logger.info(`${data.length} adet uygulama (/) komutu başarıyla yüklendi!`);
    } catch (error) {
        logger.error(`Komutlar yüklenirken bir hata oluştu: ${error}`);
    }
})();
