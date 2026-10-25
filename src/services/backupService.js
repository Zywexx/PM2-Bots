const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../../config.json');

const backupsDir = path.join(__dirname, '../../backups');
const dbPath = path.join(__dirname, '../../database.db');

if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

function createBackup() {
    try {
        if (!fs.existsSync(dbPath)) {
            logger.warn('Yedeklenecek database.db dosyası bulunamadı.', 'YEDEK');
            return { success: false, error: 'database.db bulunamadı' };
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
        const backupFileName = `database_backup_${timestamp}.db`;
        const backupFilePath = path.join(backupsDir, backupFileName);

        fs.copyFileSync(dbPath, backupFilePath);

        const stats = fs.statSync(backupFilePath);
        const sizeKb = (stats.size / 1024).toFixed(2);

        logger.info(`Veritabanı yedeği alındı: ${backupFileName} (${sizeKb} KB)`, 'YEDEK');

        // 7 günden eski yedekleri temizle
        cleanOldBackups();

        return {
            success: true,
            fileName: backupFileName,
            filePath: backupFilePath,
            sizeKb
        };
    } catch (error) {
        logger.error(`Veritabanı yedeği alınırken hata: ${error.message}`, 'YEDEK', error);
        return { success: false, error: error.message };
    }
}

function cleanOldBackups(daysToKeep = 7) {
    try {
        const files = fs.readdirSync(backupsDir).filter(f => f.startsWith('database_backup_') && f.endsWith('.db'));
        const now = Date.now();
        const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

        for (const file of files) {
            const filePath = path.join(backupsDir, file);
            const stat = fs.statSync(filePath);
            if (now - stat.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
                logger.info(`Eski yedek dosyası silindi: ${file}`, 'YEDEK');
            }
        }
    } catch (error) {
        logger.warn(`Eski yedekler temizlenirken hata: ${error.message}`, 'YEDEK');
    }
}

function initScheduledBackups(client) {
    // Her gün saat 03:00'te otomatik yedek al
    cron.schedule('0 3 * * *', async () => {
        logger.info('Planlanmış otomatik veritabanı yedeği başlatılıyor...', 'YEDEK');
        const result = createBackup();
        
        if (result.success && client) {
            const logChannelId = config.channels?.yedek_log || config.channels?.ceza_log;
            if (logChannelId) {
                const channel = client.channels?.cache?.get(logChannelId);
                if (channel) {
                    const { createBackupLogEmbed } = require('../utils/embeds');
                    const embed = createBackupLogEmbed({
                        fileName: result.fileName,
                        sizeKb: result.sizeKb,
                        manual: false
                    });
                    await channel.send({ embeds: [embed] }).catch(() => {});
                }
            }
        }
    });

    logger.info('Günlük otomatik veritabanı yedekleme cron zamanlayıcısı kuruldu (03:00).', 'YEDEK');
}

module.exports = {
    createBackup,
    cleanOldBackups,
    initScheduledBackups
};
