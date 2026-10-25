const config = require('../../../config.json');
const penalService = require('../../services/penalService');
const logger = require('../../utils/logger');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        try {
            const activePenalties = penalService.getByUserId(member.id);
            const activeJail = activePenalties.find(p => p.type === 'jail');
            const activeMute = activePenalties.find(p => p.type === 'mute');

            if (activeJail) {
                const jailRoles = (config.penals?.jail?.roles || []).map(r => String(r)).filter(r => member.guild.roles.cache.has(r));
                for (const roleId of jailRoles) {
                    await member.roles.add(roleId).catch(err => {
                        logger.warn(`Jail rolü geri yüklenemedi (${member.id}): ${err.message}`, 'MOD-KORUMA');
                    });
                }
                if (member.manageable && member.id !== member.guild.ownerId) {
                    await member.setNickname(`[JAIL] ${member.user.username}`).catch(() => {});
                }
                logger.info(`Ceza Koruması: ${member.user.tag} aktif jail cezası sebebiyle jail'e geri alındı.`, 'MOD-KORUMA');

                // Ceza log kanalına bildir
                const cezaLogId = config.channels?.ceza_log;
                if (cezaLogId) {
                    const logChannel = member.guild.channels.cache.get(cezaLogId);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🚨 Ceza Bypass Girişimi Engellendi')
                            .setColor('#ED4245')
                            .setDescription(`Sunucudan ayrılıp geri dönen <@${member.id}> (\`${member.id}\`) adlı üyenin aktif **JAIL** cezası tespit edildi ve rolleri otomatik olarak geri yüklendi.`)
                            .addFields(
                                { name: 'Ceza ID', value: `#${activeJail.id}`, inline: true },
                                { name: 'Sebep', value: activeJail.reason || 'Belirtilmedi', inline: true },
                                { name: 'Yetkili', value: `<@${activeJail.staff_id}>`, inline: true }
                            )
                            .setTimestamp();
                        await logChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            } else if (activeMute) {
                const muteRoles = (config.penals?.mute?.roles || []).map(r => String(r)).filter(r => member.guild.roles.cache.has(r));
                for (const roleId of muteRoles) {
                    await member.roles.add(roleId).catch(err => {
                        logger.warn(`Mute rolü geri yüklenemedi (${member.id}): ${err.message}`, 'MOD-KORUMA');
                    });
                }
                logger.info(`Ceza Koruması: ${member.user.tag} aktif mute cezası sebebiyle susturuldu.`, 'MOD-KORUMA');
            }
        } catch (error) {
            logger.error(`Moderasyon guildMemberAdd hatası: ${error.message}`, 'MOD-KORUMA');
        }
    }
};
