require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database/db');
const logger = require('./utils/logger');

// İstemci oluştur
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
    logger.info('Veritabanı başarıyla başlatıldı ve bağlandı.');
} catch (error) {
    logger.error(`Veritabanı başlatılırken hata oluştu: ${error.message}`);
    process.exit(1);
}

// Komutları Yükle
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
                client.commands.set(command.data.name, command);
                logger.debug(`Komut yüklendi: ${command.data.name}`);
            } else {
                logger.warn(`${filePath} komutu hatalı, 'data' veya 'execute' özelliği eksik.`);
            }
        }
    }
}

// Eventleri Yükle
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        logger.debug(`Event yüklendi: ${event.name}`);
    }
}

// Logger'a client referansını bağla (Discord hata log kanalı için)
logger.setClient(client);

// Beklenmeyen Hataları Yakala (Terminal + Dosya + Discord)
process.on('unhandledRejection', error => {
    logger.error('Yakalanmayan İstisna Reddi (Unhandled Rejection)', 'PROCESS', error);
});

process.on('uncaughtException', error => {
    logger.error('Yakalanmayan Hata (Uncaught Exception)', 'PROCESS', error);
});

// Bota Giriş Yap
client.login(process.env.DISCORD_TOKEN).then(() => {
    logger.info(`Discord API'ye başarıyla giriş yapıldı: ${client.user.tag}`, 'BAŞLATICI');
}).catch(error => {
    logger.error(`Discord API'ye giriş yapılırken hata oluştu: ${error.message}`, 'GİRİŞ', error);
});
