const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { hasStaffPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const penalService = require('../../services/penalService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Kullanıcının uyarı geçmişini görüntüler.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Geçmişi görüntülenecek kullanıcı')
                .setRequired(true)),

    async execute(interaction) {
        try {
            if (!hasStaffPermission(interaction.member, 'warn')) {
                return interaction.reply({ embeds: [errorEmbed('Bu komutu kullanmak için gerekli yetkiye sahip değilsiniz.')], ephemeral: true });
            }

            const targetUser = interaction.options.getUser('kullanici');
            const warns = penalService.getByType(targetUser.id, 'warn');

            if (!warns || warns.length === 0) {
                return interaction.reply({ embeds: [infoEmbed(`<@${targetUser.id}> kullanıcısının herhangi bir uyarısı bulunmamaktadır.`)], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ UYARI GEÇMİŞİ - ${targetUser.username}`)
                .setColor(0xFFA500)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

            let description = '';
            warns.forEach(warn => {
                const date = new Date(warn.created_at || Date.now());
                const status = warn.status === 'active' ? 'Aktif' : 'Kaldırıldı';
                description += `**#${warn.id}** | ${warn.reason} | Yetkili: <@${warn.staff_id}> | <t:${Math.floor(date.getTime() / 1000)}:R> | Durum: ${status}\n`;
            });

            embed.setDescription(description);

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Warns command error:', error);
            await interaction.reply({ embeds: [errorEmbed('İşlem sırasında bir hata oluştu.')], ephemeral: true }).catch(() => {});
        }
    }
};
