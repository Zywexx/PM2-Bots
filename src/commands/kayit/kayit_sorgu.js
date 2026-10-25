const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger.js');
const { errorEmbed, infoEmbed } = require('../../utils/embeds.js');
const registrationService = require('../../services/registrationService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit_sorgu')
        .setDescription('Kullanıcının kayıt bilgisini sorgular.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Sorgulanacak kullanıcı')
                .setRequired(true)
        ),
    async execute(interaction) {
        try {
            const kullanici = interaction.options.getUser('kullanici');
            
            const registration = await registrationService.getByUserId(kullanici.id);
            if (!registration) {
                return interaction.reply({ embeds: [errorEmbed('Kayıt bulunamadı.')], ephemeral: true });
            }

            const embed = infoEmbed('🔍 KAYIT BİLGİSİ')
                .addFields(
                    { name: 'Kullanıcı', value: `${kullanici} (${kullanici.id})`, inline: true },
                    { name: 'Kayıt Tarihi', value: `<t:${Math.floor(new Date(registration.created_at || registration.createdAt).getTime() / 1000)}:F>`, inline: true },
                    { name: 'Kayıt Yapan', value: `<@${registration.registered_by || registration.registeredBy}>`, inline: true },
                    { name: 'İsim', value: registration.name, inline: true },
                    { name: 'Yaş', value: registration.age.toString(), inline: true },
                    { name: 'Cinsiyet', value: registration.gender ? (registration.gender.charAt(0).toUpperCase() + registration.gender.slice(1)) : 'Belirtilmedi', inline: true }
                );

            const findcordBtn = new ButtonBuilder()
                .setCustomId(`findcord_kayit_sorgu:${kullanici.id}`)
                .setLabel('Findcord Kayıt')
                .setEmoji('🌐')
                .setStyle(ButtonStyle.Primary);

            const historyBtn = new ButtonBuilder()
                .setCustomId(`kayit_gecmisi:${registration.id}`)
                .setLabel('Değişiklik Geçmişi')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(findcordBtn, historyBtn);

            await interaction.reply({ embeds: [embed], components: [row] });
        } catch (error) {
            logger.error(`Kayit sorgu command error: ${error.message}`, 'KAYIT', error);
            await interaction.reply({ embeds: [errorEmbed('Kayıt sorgulama sırasında bir hata oluştu.')], ephemeral: true });
        }
    }
};
