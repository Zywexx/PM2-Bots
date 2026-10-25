const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { formatDate, relativeTime, getWeeklyKey, getMonthlyKey } = require('../../utils/time.js');
const { checkPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, infoEmbed, createRegistrationLogEmbed } = require('../../utils/embeds.js');
const registrationService = require('../../services/registrationService.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit')
        .setDescription('Kullanıcıyı kayıt eder.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Kayıt edilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('cinsiyet')
                .setDescription('Kullanıcının cinsiyeti')
                .setRequired(true)
                .addChoices(
                    { name: 'Erkek', value: 'erkek' },
                    { name: 'Kız', value: 'kız' }
                )
        )
        .addStringOption(option => 
            option.setName('isim')
                .setDescription('Kullanıcının ismi')
                .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('yas')
                .setDescription('Kullanıcının yaşı (13-99)')
                .setRequired(true)
                .setMinValue(13)
                .setMaxValue(99)
        )
        .addStringOption(option => 
            option.setName('tag')
                .setDescription('Kullanıcının tagı (Varsayılan: |)')
                .setRequired(false)
        ),
    async execute(interaction) {
        try {
            if (!(await checkPermission(interaction, 'kayit_yapabilir'))) {
                return;
            }

            const kullanici = interaction.options.getUser('kullanici');
            const member = interaction.options.getMember('kullanici');
            const cinsiyet = interaction.options.getString('cinsiyet');
            const isim = interaction.options.getString('isim');
            const yas = interaction.options.getInteger('yas');
            const tag = interaction.options.getString('tag') || '|';

            if (!member) {
                return interaction.reply({ embeds: [errorEmbed('Kullanıcı sunucuda bulunamadı.')], ephemeral: true });
            }

            const registration = await registrationService.create({
                userId: member.id,
                registeredBy: interaction.user.id,
                name: isim,
                age: yas,
                gender: cinsiyet
            });

            const newNickname = `${isim} ${tag} ${yas}`;
            if (member.manageable && member.id !== interaction.guild.ownerId) {
                await member.setNickname(newNickname).catch(err => logger.warn(`Nickname değiştirilemedi (${member.id}): ${err.message}`));
            } else {
                logger.warn(`Üyenin ismi değiştirilemez (Sunucu sahibi veya bottan üstün rol): ${member.user.tag}`);
            }

            const erkekRole = config.roles?.erkek;
            const kizRole = config.roles?.kiz;
            const kayitsizRole = config.roles?.kayitsiz;

            if (cinsiyet === 'erkek' && erkekRole && interaction.guild.roles.cache.has(erkekRole)) {
                await member.roles.add(erkekRole).catch(err => logger.warn(`Erkek rolü verilemedi: ${err.message}`));
            } else if (cinsiyet === 'kız' && kizRole && interaction.guild.roles.cache.has(kizRole)) {
                await member.roles.add(kizRole).catch(err => logger.warn(`Kız rolü verilemedi: ${err.message}`));
            }

            if (kayitsizRole && member.roles.cache.has(kayitsizRole)) {
                await member.roles.remove(kayitsizRole).catch(err => logger.warn(`Kayıtsız rolü alınamadı: ${err.message}`));
            }

            const logChannelId = config.channels?.kayit_log;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = createRegistrationLogEmbed({
                        member,
                        staffUser: interaction.user,
                        name: isim,
                        age: yas,
                        gender: cinsiyet,
                        tag,
                        registrationId: registration.id
                    });

                    const cancelBtn = new ButtonBuilder()
                        .setCustomId(`kayit_iptal:${registration.id}`)
                        .setLabel('Kaydı İptal Et')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(cancelBtn);

                    await logChannel.send({ embeds: [logEmbed], components: [row] }).catch(err => logger.error(`Log mesajı gönderilemedi: ${err.message}`));
                }
            }

            await interaction.reply({ embeds: [successEmbed(`${member} adlı kullanıcı başarıyla kayıt edildi.`)], ephemeral: true });
        } catch (error) {
            logger.error(`Kayit command error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('Kayıt işlemi sırasında bir hata oluştu.')], ephemeral: true });
        }
    }
};
