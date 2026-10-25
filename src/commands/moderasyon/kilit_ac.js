const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kilit_ac')
        .setDescription('Kilitlenmiş olan kanalın kilidini açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption(option =>
            option.setName('sebep')
                .setDescription('Kanal kilidini açma sebebi')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const sebep = interaction.options.getString('sebep') || 'Belirtilmedi';
            const channel = interaction.channel;
            const everyoneRole = interaction.guild.roles.everyone;

            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null
            }, { reason: `${interaction.user.tag}: ${sebep}` });

            const unlockEmbed = new EmbedBuilder()
                .setTitle('🔓 Kanal Kilidi Açıldı')
                .setColor('#2ECC71')
                .setDescription('Bu kanalın kilidi yetkili tarafından açılmıştır, mesaj gönderebilirsiniz.')
                .addFields(
                    { name: '🛡️ Kilidi Açan Yetkili', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📝 Sebep', value: sebep, inline: true }
                )
                .setTimestamp();

            await channel.send({ embeds: [unlockEmbed] });

            return interaction.reply({
                embeds: [successEmbed('Kanal Açıldı', `Kanal kilidi başarıyla açıldı.\nSebep: **${sebep}**`)],
                ephemeral: true
            });
        } catch (error) {
            logger.error(`Kilit Aç komutunda hata: ${error.message}`, 'MODERASYON', error);
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Kanal kilidi açılırken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
