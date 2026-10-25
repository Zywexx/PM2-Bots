require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const logger = require('./utils/logger');

// Kayıt Botu İstemcisi
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

client.commands = new Collection();

// Veritabanını Başlat
try {
    db.initialize();
    logger.info('Veritabanı bağlantısı başarılı.', 'KAYIT-BOT');
} catch (error) {
    logger.error(`Veritabanı başlatılırken hata: ${error.message}`, 'KAYIT-BOT');
    process.exit(1);
}

// Kayıt Komutlarını Yükle
const kayitCommandsPath = path.join(__dirname, 'commands', 'kayit');
if (fs.existsSync(kayitCommandsPath)) {
    const files = fs.readdirSync(kayitCommandsPath).filter(f => f.endsWith('.js'));
    for (const file of files) {
        const filePath = path.join(kayitCommandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.debug(`Kayıt komutu yüklendi: /${command.data.name}`, 'KAYIT-LOADER');
        } else {
            logger.warn(`${filePath} komutunda data veya execute eksik.`, 'KAYIT-LOADER');
        }
    }
}

// Kayıt Eventlerini Yükle
const kayitEventsPath = path.join(__dirname, 'events', 'kayit');
if (fs.existsSync(kayitEventsPath)) {
    const eventFiles = fs.readdirSync(kayitEventsPath).filter(f => f.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(kayitEventsPath, file);
        const event = require(filePath);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.debug(`Kayıt eventi yüklendi: ${event.name}`, 'KAYIT-LOADER');
    }
}

// Hata Yakalama
process.on('unhandledRejection', error => {
    logger.error('Yakalanmayan İstisna Reddi (Unhandled Rejection)', 'KAYIT-PROCESS', error);
});

process.on('uncaughtException', error => {
    logger.error('Yakalanmayan Hata (Uncaught Exception)', 'KAYIT-PROCESS', error);
});

// Graceful Shutdown — WAL'ı database.db'ye yaz, bağlantıyı kapat
function gracefulShutdown(signal) {
    logger.info(`${signal} sinyali alındı. Bot kapatılıyor...`, 'KAYIT-PROCESS');
    try {
        client.destroy();
        logger.info('Discord bağlantısı kapatıldı.', 'KAYIT-PROCESS');
    } catch (_) {}
    db.close();
    logger.info('Kayıt Botu düzgün şekilde kapatıldı.', 'KAYIT-PROCESS');
    process.exit(0);
}

process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Bota Giriş Yap
const token = process.env.KAYIT_BOT_TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('KAYIT_BOT_TOKEN veya DISCORD_TOKEN tanımlanmamış (.env kontrol edin).', 'KAYIT-AUTH');
    process.exit(1);
}

client.login(token).then(() => {
    logger.info(`Kayıt Botu Discord'a bağlandı: ${client.user.tag}`, 'KAYIT-BAŞLATICI');
}).catch(async error => {
    if (error.message.includes('disallowed intents')) {
        logger.error(
            'Kayıt Botu için Discord Developer Portal\'da "SERVER MEMBERS INTENT" izni kapalı!\n' +
            '>>> ÇÖZÜM:\n' +
            '1. https://discord.com/developers/applications adresine gidin.\n' +
            '2. Kayıt Botunuzun uygulamasını seçin.\n' +
            '3. Sol menüden "Bot" sekmesine tıklayın.\n' +
            '4. "Privileged Gateway Intents" altındaki "SERVER MEMBERS INTENT" kutucuğunu açık (ON) yapıp kaydedin (Save Changes).\n' +
            '5. Ardından "pm2 restart palik-kayit-bot" komutunu çalıştırın.',
            'KAYIT-BAŞLATICI'
        );
        await new Promise(r => setTimeout(r, 15000));
        process.exit(1);
    } else {
        logger.error(`Kayıt Botu Discord giriş hatası: ${error.message}`, 'KAYIT-BAŞLATICI', error);
        process.exit(1);
    }
});

module.exports = client;
