const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { errorEmbed } = require('../../utils/embeds.js');
const { hasStaffPermission, hasPermission } = require('../../utils/permissions.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sicil')
        .setDescription('Kullanıcının ceza sicilini görüntüler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Sicili görüntülenecek kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const isStaff = hasPermission(interaction.member, 'kayit_yapabilir') ||
                            hasStaffPermission(interaction.member, 'ban') ||
                            hasStaffPermission(interaction.member, 'jail') ||
                            hasStaffPermission(interaction.member, 'mute') ||
                            hasStaffPermission(interaction.member, 'warn') ||
                            hasStaffPermission(interaction.member, 'timeout') ||
                            interaction.member.permissions.has('ModerateMembers') ||
                            interaction.member.permissions.has('Administrator');

            if (!isStaff) {
                return interaction.reply({ embeds: [errorEmbed('Erişim Reddedildi', 'Bu komutu kullanmak için yetkili olmanız gerekmektedir.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const summary = penalService.getSummary(targetUser.id);
            
            if (!summary) {
                return interaction.reply({ embeds: [errorEmbed('Sicil bilgisi alınamadı.')], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 KULLANICI SİCİLİ')
                .setDescription(`👤 <@${targetUser.id}>   🆔 \`${targetUser.id}\``)
                .addFields(
                    { 
                        name: '⚡ Aktif Cezalar', 
                        value: `🔴 Ban ${summary.active.ban}   🟣 Jail ${summary.active.jail}   🟠 Kick ${summary.active.kick}   🟡 Mute ${summary.active.mute}   ⚠️ Warn ${summary.active.warn}   ⏰ Timeout ${summary.active.timeout}` 
                    },
                    { 
                        name: '📜 Eski / Kaldırılan Cezalar', 
                        value: `🔴 Ban ${summary.old.ban}   🟣 Jail ${summary.old.jail}   🟠 Kick ${summary.old.kick}   🟡 Mute ${summary.old.mute}   ⚠️ Warn ${summary.old.warn}   ⏰ Timeout ${summary.old.timeout}` 
                    },
                    { 
                        name: '🎯 Toplam', 
                        value: `Toplam Ceza: ${summary.totalCount} *(Aktif: ${summary.activeCount} | Eski: ${summary.oldCount})*     💯 Ceza Puanı: ${summary.totalPoints}` 
                    }
                )
                .setColor(summary.totalPoints >= 20 ? 0xED4245 : summary.totalPoints > 0 ? 0xFEE75C : 0x2B2D31)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: config.footer || '787 INC By Zywexx' })
                .setTimestamp();

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`sicil_tum:${targetUser.id}`).setLabel('Tümü').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`sicil_ban:${targetUser.id}`).setLabel('Banlar').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`sicil_jail:${targetUser.id}`).setLabel('Jailler').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`sicil_mute:${targetUser.id}`).setLabel('Muteler').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`sicil_warn:${targetUser.id}`).setLabel('Uyarılar').setStyle(ButtonStyle.Secondary)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`sicil_yetkili_dagilimi:${targetUser.id}`).setLabel('Yetkili Dağılımı').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`sicil_findcord:${targetUser.id}`).setLabel('Findcord').setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({ embeds: [embed], components: [row1, row2] });
        } catch (error) {
            logger.error('Sicil command error:', 'SİCİL', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};

