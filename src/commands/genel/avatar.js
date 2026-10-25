const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Kullanıcının profil fotoğrafını (avatarını) görüntüler.')
        .addUserOption(option =>
            option.setName('kullanici')
                .setDescription('Avatarı görüntülenecek kullanıcı (Varsayılan: Kendiniz)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('sunucu_ozel')
                .setDescription('Kullanıcının bu sunucuya özel avatarını göster (Varsa)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('kullanici') || interaction.user;
            const serverSpecific = interaction.options.getBoolean('sunucu_ozel') || false;

            let avatarUrl;
            let title;

            if (serverSpecific) {
                const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
                if (member && member.avatar) {
                    avatarUrl = member.avatarURL({ dynamic: true, size: 2048 });
                    title = `🖼️ ${targetUser.tag || targetUser.username} — Sunucu Özel Avatarı`;
                }
            }

            if (!avatarUrl) {
                avatarUrl = targetUser.displayAvatarURL({ dynamic: true, size: 2048 });
                title = `🖼️ ${targetUser.tag || targetUser.username} — Profil Avatarı`;
            }

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor('#5865F2')
                .setImage(avatarUrl)
                .setFooter({ text: config.footer || '787 INC By Zywexx' })
                .setTimestamp();

            // İndirme Format Butonları
            const pngUrl = targetUser.displayAvatarURL({ extension: 'png', size: 2048 });
            const jpgUrl = targetUser.displayAvatarURL({ extension: 'jpg', size: 2048 });
            const webpUrl = targetUser.displayAvatarURL({ extension: 'webp', size: 2048 });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('PNG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(pngUrl),
                new ButtonBuilder()
                    .setLabel('JPG')
                    .setStyle(ButtonStyle.Link)
                    .setURL(jpgUrl),
                new ButtonBuilder()
                    .setLabel('WEBP')
                    .setStyle(ButtonStyle.Link)
                    .setURL(webpUrl)
            );

            if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
                const gifUrl = targetUser.displayAvatarURL({ extension: 'gif', size: 2048 });
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel('GIF')
                        .setStyle(ButtonStyle.Link)
                        .setURL(gifUrl)
                );
            }

            return interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            const { errorEmbed } = require('../../utils/embeds');
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Avatar alınırken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};

