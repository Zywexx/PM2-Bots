const fs = require('fs');
const path = require('path');

// Logs klasörü oluşturma
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const combinedLogPath = path.join(logsDir, 'bot.log');
const errorLogPath = path.join(logsDir, 'errors.log');

// ANSI Renk Kodları (Terminal için)
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgYellow: '\x1b[43m'
};

function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function writeToFile(filePath, text) {
    try {
        fs.appendFileSync(filePath, text + '\n', 'utf8');
    } catch (e) {
        console.error('Log dosyasına yazılamadı:', e.message);
    }
}

let discordClient = null;

function setClient(client) {
    discordClient = client;
}

async function sendDiscordLog(level, title, message, error = null) {
    if (!discordClient) return;
    try {
        const config = require('../../config.json');
        const channelId = config.channels?.hata_log;
        if (!channelId) return;

        const channel = discordClient.channels?.cache?.get(channelId);
        if (!channel) return;

        const { EmbedBuilder } = require('discord.js');
        const color = level === 'HATA' ? '#FF0000' : level === 'UYARI' ? '#FFA500' : '#0099FF';

        let desc = `**Zaman:** <t:${Math.floor(Date.now() / 1000)}:F>\n**Mesaj:** ${message}`;
        if (error && error.stack) {
            const stackSnippet = error.stack.substring(0, 1000);
            desc += `\n\`\`\`js\n${stackSnippet}\n\`\`\``;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🚨 [${level}] ${title}`)
            .setDescription(desc.substring(0, 4000))
            .setColor(color)
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
        // Discord loglama hatası konsolu çökertmemeli
    }
}

function log(level, levelColor, tag, message, extra = null) {
    const timestamp = getTimestamp();
    const plainText = `[${timestamp}] [${level}] [${tag}] ${message}${extra ? ` | ${extra}` : ''}`;
    
    // Konsol formatı (Renkli)
    const colorTag = `${colors.magenta}[${tag}]${colors.reset}`;
    const consoleText = `${colors.dim}[${timestamp}]${colors.reset} ${levelColor}[${level}]${colors.reset} ${colorTag} ${message}`;
    
    console.log(consoleText);
    if (extra) {
        console.log(`${colors.dim}${extra}${colors.reset}`);
    }

    // Dosyaya yazma
    writeToFile(combinedLogPath, plainText);
    if (level === 'HATA' || level === 'FATAL') {
        writeToFile(errorLogPath, plainText);
        if (extra) writeToFile(errorLogPath, String(extra));
    }
}

module.exports = {
    setClient,
    info: (message, tag = 'SİSTEM') => log('BİLGİ', colors.green, tag, message),
    warn: (message, tag = 'UYARI') => {
        log('UYARI', colors.yellow, tag, message);
        sendDiscordLog('UYARI', tag, message);
    },
    error: (message, tagOrError = 'HATA', errorObj = null) => {
        let tag = 'HATA';
        let err = errorObj;
        
        if (tagOrError instanceof Error || (tagOrError && typeof tagOrError === 'object')) {
            err = tagOrError;
            tag = 'HATA';
        } else if (typeof tagOrError === 'string') {
            tag = tagOrError;
        }

        const extra = err?.stack || (err ? String(err) : null);
        log('HATA', colors.red, tag, message, extra);
        sendDiscordLog('HATA', tag, message, err);
    },
    cmd: (commandName, userTag, guildName) => {
        const text = `/${commandName} komutu çalıştırıldı -> Yetkili/Kullanıcı: ${userTag} (${guildName || 'DM'})`;
        log('KOMUT', colors.cyan, 'SLASH', text);
    },
    btn: (customId, userTag) => {
        const text = `Buton tıklandı: "${customId}" -> Kullanıcı: ${userTag}`;
        log('BUTON', colors.blue, 'INTERACTION', text);
    },
    db: (message) => log('VERİTABANI', colors.magenta, 'SQLITE', message),
    sync: (message) => log('SENKRON', colors.cyan, 'FINDCORD', message),
    debug: (message, tag = 'DEBUG') => {
        if (process.env.DEBUG === 'true') {
            log('DEBUG', colors.dim, tag, message);
        }
    }
};
