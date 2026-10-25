const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Kanalda en son silinen mesajı gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Silinen mesajın görüntüleneceği kanal (Varsayılan: Mevcut kanal)')
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('kanal') || interaction.channel;
            const snipes = interaction.client.snipes;

            if (!snipes || !snipes.has(channel.id)) {
                return interaction.reply({
                    embeds: [infoEmbed('Silinen Mesaj Yok', `<#${channel.id}> kanalında yakın zamanda silinmiş bir mesaj bulunmuyor.`)],
                    ephemeral: true
                });
            }

            const data = snipes.get(channel.id);
            const unixTime = Math.floor(data.deletedAt / 1000);

            const embed = new EmbedBuilder()
                .setTitle(`🗑️ Son Silinen Mesaj — #${channel.name}`)
                .setColor('#ED4245')
                .setAuthor({
                    name: data.author ? `${data.author.tag || data.author.username}` : 'Bilinmeyen Kullanıcı',
                    iconURL: data.author?.displayAvatarURL ? data.author.displayAvatarURL({ dynamic: true }) : null
                })
                .setDescription(data.content ? data.content : '*[Mesaj metni içermiyordu / sadece ek dosya]*')
                .addFields(
                    { name: '👤 Yazar', value: data.author ? `<@${data.author.id}> (\`${data.author.id}\`)` : 'Bilinmiyor', inline: true },
                    { name: '⏳ Silinme Zamanı', value: `<t:${unixTime}:R>`, inline: true }
                )
                .setFooter({ text: '787 INC By Zywexx' })
                .setTimestamp(data.deletedAt);

            if (data.image) {
                embed.setImage(data.image);
            }

            return interaction.reply({ embeds: [embed] });
        } catch (error) {
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Snipe alınırken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};

