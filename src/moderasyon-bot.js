require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const logger = require('./utils/logger');

// Moderasyon Botu İstemcisi
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
client.snipes = new Map();

// Veritabanını Başlat
try {
    db.initialize();
    logger.info('Veritabanı bağlantısı başarılı.', 'MOD-BOT');
} catch (error) {
    logger.error(`Veritabanı başlatılırken hata: ${error.message}`, 'MOD-BOT');
    process.exit(1);
}

// Moderasyon ve Genel Komutları Yükle
const commandFolders = ['moderasyon', 'genel'];
for (const folder of commandFolders) {
    const folderPath = path.join(__dirname, 'commands', folder);
    if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                logger.debug(`Moderasyon komutu yüklendi: /${command.data.name}`, 'MOD-LOADER');
            } else {
                logger.warn(`${filePath} komutunda data veya execute eksik.`, 'MOD-LOADER');
            }
        }
    }
}

// Moderasyon Eventlerini Yükle
const modEventsPath = path.join(__dirname, 'events', 'moderasyon');
if (fs.existsSync(modEventsPath)) {
    const eventFiles = fs.readdirSync(modEventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(modEventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.debug(`Moderasyon eventi yüklendi: ${event.name}`, 'MOD-LOADER');
    }
}

// Logger'a Moderasyon client referansını bağla
logger.setClient(client);

// Hata Yakalama
process.on('unhandledRejection', error => {
    logger.error('Yakalanmayan İstisna Reddi (Unhandled Rejection)', 'MOD-PROCESS', error);
});

process.on('uncaughtException', error => {
    logger.error('Yakalanmayan Hata (Uncaught Exception)', 'MOD-PROCESS', error);
});

// Graceful Shutdown — WAL'ı database.db'ye yaz, bağlantıyı kapat
function gracefulShutdown(signal) {
    logger.info(`${signal} sinyali alındı. Bot kapatılıyor...`, 'MOD-PROCESS');
    try {
        client.destroy();
        logger.info('Discord bağlantısı kapatıldı.', 'MOD-PROCESS');
    } catch (_) {}
    db.close();
    logger.info('Moderasyon Botu düzgün şekilde kapatıldı.', 'MOD-PROCESS');
    process.exit(0);
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Bota Giriş Yap
const token = process.env.MOD_BOT_TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('MOD_BOT_TOKEN veya DISCORD_TOKEN tanımlanmamış (.env kontrol edin).', 'MOD-AUTH');
    process.exit(1);
}

client.login(token).then(() => {
    logger.info(`Moderasyon Botu Discord'a bağlandı: ${client.user.tag}`, 'MOD-BAŞLATICI');
}).catch(async error => {
    if (error.message.includes('disallowed intents')) {
        logger.error(
            'Moderasyon Botu için Discord Developer Portal\'da "Privileged Gateway Intents" (Server Members Intent & Message Content Intent) izni kapalı!\n' +
            '>>> ÇÖZÜM:\n' +
            '1. https://discord.com/developers/applications adresine gidin.\n' +
            '2. Bot uygulamasını seçin.\n' +
            '3. Sol menüden "Bot" sekmesine tıklayın.\n' +
            '4. "Privileged Gateway Intents" altındaki "SERVER MEMBERS INTENT" ve "MESSAGE CONTENT INTENT" kutucuklarını açıp kaydedin.\n' +
            '5. Ardından "pm2 restart palik-moderasyon-bot" çalıştırın.',
            'MOD-BAŞLATICI'
        );
        await new Promise(r => setTimeout(r, 15000));
        process.exit(1);
    } else {
        logger.error(`Moderasyon Botu Discord giriş hatası: ${error.message}`, 'MOD-BAŞLATICI', error);
        process.exit(1);
    }
});

module.exports = client;
