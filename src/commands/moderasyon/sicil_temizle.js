const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { checkPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, createRevokeLogEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');
const { db } = require('../../database/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicil_temizle')
        .setDescription('Kullanıcının sicilinden belirli bir cezayı veya tüm sicilini temizler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Sicili temizlenecek kullanıcı')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('ceza_id')
                .setDescription('Temizlenecek cezanın IDsi (Boş bırakıp tüm sicili temizleyebilirsiniz)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('tum_sicil')
                .setDescription('Kullanıcının tüm aktif cezalarını kaldırıp ceza puanını sıfırlar')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('tamamen_sil')
                .setDescription('Cezayı arşivlemek yerine veritabanından tamamen siler (Varsayılan: False)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const hasPerm = await checkPermission(interaction, 'sicil_temizle');
            if (!hasPerm) return;

            const targetUser = interaction.options.getUser('kullanici');
            const cezaId = interaction.options.getInteger('ceza_id');
            const tumSicil = interaction.options.getBoolean('tum_sicil') || false;
            const tamamenSil = interaction.options.getBoolean('tamamen_sil') || false;

            if (!cezaId && !tumSicil) {
                return interaction.reply({
                    embeds: [errorEmbed('Eksik Seçim', 'Lütfen temizlemek istediğiniz cezanın **ceza_id** numarasını girin veya **tum_sicil: True** seçeneğini kullanın.')],
                    ephemeral: true
                });
            }

            const logChannelId = config.channels?.ceza_log;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);

            if (tumSicil) {
                if (tamamenSil) {
                    const info = db.prepare('DELETE FROM penalties WHERE user_id = ?').run(targetUser.id);
                    logger.info(`${interaction.user.tag} tarafından ${targetUser.tag} kullanıcısının tüm cezaları veritabanından tamamen silindi (${info.changes} ceza).`, 'SİCİL-TEMİZLE');

                    return interaction.reply({
                        embeds: [successEmbed('Tüm Sicil Silindi', `<@${targetUser.id}> kullanıcısına ait toplam **${info.changes}** ceza kaydı veritabanından kalıcı olarak silindi ve ceza puanı sıfırlandı.`)]
                    });
                } else {
                    const count = penalService.revokeAll(targetUser.id, interaction.user.id, 'Tüm sicil temizleme');
                    logger.info(`${interaction.user.tag} tarafından ${targetUser.tag} kullanıcısının ${count} cezası iptal edildi.`, 'SİCİL-TEMİZLE');

                    if (logChannel) {
                        const revokeEmbed = createRevokeLogEmbed({
                            targetUser,
                            staffUser: interaction.user,
                            type: 'TÜM SİCİL',
                            reason: `Tüm aktif cezalar temizlendi (${count} işlem iptal edildi)`
                        });
                        await logChannel.send({ embeds: [revokeEmbed] }).catch(() => {});
                    }

                    return interaction.reply({
                        embeds: [successEmbed('Tüm Sicil Temizlendi', `<@${targetUser.id}> kullanıcısının toplam **${count}** aktif cezası iptal edildi, ceza puanından düşüldü ve eski cezalar arşivine aktarıldı.`)]
                    });
                }
            }

            // Tekil Ceza İşlemi
            const penalty = penalService.getDetail(cezaId);
            if (!penalty || penalty.user_id !== targetUser.id) {
                return interaction.reply({
                    embeds: [errorEmbed('Hata', 'Belirtilen ID ile bu kullanıcıya ait bir ceza kaydı bulunamadı.')],
                    ephemeral: true
                });
            }

            if (tamamenSil) {
                penalService.deletePenalty(cezaId);
                logger.info(`${interaction.user.tag} tarafından #${cezaId} numaralı ceza kalıcı olarak silindi.`, 'SİCİL-SİL');

                return interaction.reply({
                    embeds: [successEmbed('Ceza Tamamen Silindi', `<@${targetUser.id}> kullanıcısının **#${cezaId}** ID'li cezası veritabanından kalıcı olarak silindi ve ceza puanından düşüldü.`)]
                });
            } else {
                penalService.revoke(cezaId, interaction.user.id, 'Sicil temizleme');

                if (logChannel) {
                    const revokeEmbed = createRevokeLogEmbed({
                        targetUser,
                        staffUser: interaction.user,
                        type: penalty.type || 'ceza',
                        reason: `Sicil Temizleme (#${cezaId})`,
                        penaltyId: cezaId
                    });
                    await logChannel.send({ embeds: [revokeEmbed] }).catch(err => logger.error('Log channel send error:', err));
                }

                return interaction.reply({
                    embeds: [successEmbed('Ceza İptal Edildi', `<@${targetUser.id}> kullanıcısının **#${cezaId}** ID'li cezası iptal edildi, puanı düşürüldü ve eski cezalar bölümüne aktarıldı.`)]
                });
            }
        } catch (error) {
            logger.error('Sicil temizle command error:', 'SİCİL-TEMİZLE', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu: ' + error.message)], ephemeral: true }).catch(() => {});
        }
    }
};
