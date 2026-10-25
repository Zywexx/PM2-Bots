const logger = require('../utils/logger');
const penalService = require('../services/penalService');
const config = require('../../config.json');
const cron = require('node-cron');

// Global timed penalties map for access from other modules
if (!global.timedPenalties) global.timedPenalties = new Map();
const timedPenalties = global.timedPenalties;

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`Bot hazır! Giriş yapıldı: ${client.user.tag}`);
        logger.info(`${client.guilds.cache.size} sunucuda aktif.`);


        // Süreli cezaları geri yükle (mute/jail/timeout)
        try {
            const activeTimed = penalService.getActiveTimed();
            const now = Date.now();
            let restoredCount = 0;

            for (const penalty of activeTimed) {
                const expiresAt = new Date(penalty.expires_at).getTime();
                const remainingTime = Math.max(0, expiresAt - now);

                const timerKey = `${penalty.type}_${penalty.user_id}`;
                const timeoutId = setTimeout(async () => {
                    timedPenalties.delete(timerKey);
                    timedPenalties.delete(penalty.id);
                    try {
                        // DB'de revoke et
                        penalService.revoke(penalty.id, client.user.id, 'Süre doldu (Otomatik)');

                        // Discord'daki rolleri kaldır
                        const guild = client.guilds.cache.first();
                        if (guild) {
                            try {
                                const member = await guild.members.fetch(penalty.user_id);
                                if (member) {
                                    if (penalty.type === 'mute') {
                                        const muteRoles = (config.penals?.mute?.roles || []).map(r => String(r));
                                        for (const roleId of muteRoles) {
                                            if (member.roles.cache.has(roleId)) {
                                                await member.roles.remove(roleId, 'Mute süresi doldu');
                                            }
                                        }
                                        logger.info(`Mute süresi doldu: ${penalty.user_id} - Roller kaldırıldı`);
                                    } else if (penalty.type === 'jail') {
                                        const jailRoles = (config.penals?.jail?.roles || []).map(r => String(r));
                                        for (const roleId of jailRoles) {
                                            if (member.roles.cache.has(roleId)) {
                                                await member.roles.remove(roleId, 'Jail süresi doldu');
                                            }
                                        }
                                        logger.info(`Jail süresi doldu: ${penalty.user_id} - Roller kaldırıldı`);
                                    } else if (penalty.type === 'timeout') {
                                        await member.timeout(null, 'Timeout süresi doldu');
                                        logger.info(`Timeout süresi doldu: ${penalty.user_id}`);
                                    }
                                }
                            } catch (memberError) {
                                logger.warn(`Üye bulunamadı veya rol kaldırılamadı (${penalty.user_id}): ${memberError.message}`);
                            }
                        }
                    } catch (error) {
                        logger.error(`Süreli ceza kaldırılırken hata (ID: ${penalty.id}): ${error.message}`);
                    }
                }, remainingTime);

                timedPenalties.set(timerKey, timeoutId);
                timedPenalties.set(penalty.id, timeoutId);
                restoredCount++;
            }

            if (restoredCount > 0) {
                logger.info(`${restoredCount} süreli ceza geri yüklendi.`);
            }
        } catch (error) {
            logger.error(`Süreli cezalar geri yüklenirken hata: ${error.message}`);
        }

        // Haftalık sıfırlama cron job'ı (Pazar gece yarısı)
        cron.schedule('0 0 * * 0', () => {
            logger.info('Haftalık cron job çalıştırıldı.', 'CRON');
        });

        // Günlük otomatik veritabanı yedeğini başlat
        try {
            const backupService = require('../services/backupService');
            backupService.initScheduledBackups(client);
        } catch (backupErr) {
            logger.error(`Yedekleme servisi başlatılırken hata: ${backupErr.message}`, 'YEDEK', backupErr);
        }
    }
};

module.exports.timedPenalties = timedPenalties;
