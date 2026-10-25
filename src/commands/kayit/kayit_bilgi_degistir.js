const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../../database/db.js');
const config = require('../../../config.json');
const logger = require('../../utils/logger.js');
const { checkPermission } = require('../../utils/permissions.js');
const { successEmbed, errorEmbed, infoEmbed, createRegistrationUpdateLogEmbed } = require('../../utils/embeds.js');
const registrationService = require('../../services/registrationService.js');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('kayit_bilgi_degistir')
        .setDescription('Kullanıcının kayıt bilgilerini değiştirir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
        .addUserOption(option => 
            option.setName('kullanici')
                .setDescription('Bilgileri değiştirilecek kullanıcı')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('yeni_cinsiyet')
                .setDescription('Yeni cinsiyet')
                .setRequired(false)
                .addChoices(
                    { name: 'Erkek', value: 'erkek' },
                    { name: 'Kız', value: 'kız' }
                )
        )
        .addStringOption(option => 
            option.setName('yeni_isim')
                .setDescription('Yeni isim')
                .setRequired(false)
        )
        .addIntegerOption(option => 
            option.setName('yeni_yas')
                .setDescription('Yeni yaş (13-99)')
                .setRequired(false)
                .setMinValue(13)
                .setMaxValue(99)
        )
        .addStringOption(option => 
            option.setName('yeni_tag')
                .setDescription('Yeni tag')
                .setRequired(false)
        ),
    async execute(interaction) {
        try {
            if (!(await checkPermission(interaction, 'kayit_yapabilir'))) {
                return;
            }

            const kullanici = interaction.options.getUser('kullanici');
            const member = interaction.options.getMember('kullanici');
            const yeni_cinsiyet = interaction.options.getString('yeni_cinsiyet');
            const yeni_isim = interaction.options.getString('yeni_isim');
            const yeni_yas = interaction.options.getInteger('yeni_yas');
            const yeni_tag = interaction.options.getString('yeni_tag');

            if (!yeni_cinsiyet && !yeni_isim && !yeni_yas && !yeni_tag) {
                return interaction.reply({ embeds: [errorEmbed('Lütfen değiştirmek istediğiniz en az bir bilgiyi giriniz.')], ephemeral: true });
            }

            if (!member) {
                return interaction.reply({ embeds: [errorEmbed('Kullanıcı sunucuda bulunamadı.')], ephemeral: true });
            }

            const registration = await registrationService.getByUserId(member.id);
            if (!registration) {
                return interaction.reply({ embeds: [errorEmbed('Bu kullanıcıya ait bir kayıt bulunamadı.')], ephemeral: true });
            }

            const changes = {};
            if (yeni_cinsiyet) changes.gender = yeni_cinsiyet;
            if (yeni_isim) changes.name = yeni_isim;
            if (yeni_yas) changes.age = yeni_yas;

            if (Object.keys(changes).length > 0) {
                await registrationService.update(registration.id, interaction.user.id, changes);
            }

            const currentName = yeni_isim || registration.name;
            const currentAge = yeni_yas || registration.age;
            const currentTag = yeni_tag || '|';
            
            const newNickname = `${currentName} ${currentTag} ${currentAge}`;
            if (member.manageable && member.id !== interaction.guild.ownerId) {
                await member.setNickname(newNickname).catch(err => logger.warn(`Nickname değiştirilemedi: ${err.message}`));
            }

            if (yeni_cinsiyet && yeni_cinsiyet !== registration.gender) {
                const erkekRole = config.roles?.erkek;
                const kizRole = config.roles?.kiz;
                
                if (yeni_cinsiyet === 'erkek') {
                    if (kizRole && member.roles.cache.has(kizRole)) await member.roles.remove(kizRole).catch(() => {});
                    if (erkekRole && interaction.guild.roles.cache.has(erkekRole)) await member.roles.add(erkekRole).catch(() => {});
                } else if (yeni_cinsiyet === 'kız') {
                    if (erkekRole && member.roles.cache.has(erkekRole)) await member.roles.remove(erkekRole).catch(() => {});
                    if (kizRole && interaction.guild.roles.cache.has(kizRole)) await member.roles.add(kizRole).catch(() => {});
                }
            }


            const degisenler = [];
            if (yeni_isim) degisenler.push(`**İsim:** ${registration.name} -> ${yeni_isim}`);
            if (yeni_yas) degisenler.push(`**Yaş:** ${registration.age} -> ${yeni_yas}`);
            if (yeni_cinsiyet) degisenler.push(`**Cinsiyet:** ${registration.gender} -> ${yeni_cinsiyet}`);
            if (yeni_tag) degisenler.push(`**Tag:** ${currentTag} olarak güncellendi.`);

            // Kayıt Log Kanalına Bildirim Gönder
            const logChannelId = config.channels?.kayit_log;
            if (logChannelId) {
                const logChan = interaction.guild.channels.cache.get(logChannelId);
                if (logChan) {
                    const updateLogEmbed = createRegistrationUpdateLogEmbed({
                        member,
                        staffUser: interaction.user,
                        changesList: degisenler,
                        newNickname
                    });
                    await logChan.send({ embeds: [updateLogEmbed] }).catch(() => {});
                }
            }

            const responseEmbed = successEmbed(`${member} adlı kullanıcının kayıt bilgileri güncellendi.\n\n${degisenler.join('\n')}`);
            await interaction.reply({ embeds: [responseEmbed], ephemeral: false });
        } catch (error) {
            logger.error(`Kayit bilgi degistir command error: ${error.message}`);
            await interaction.reply({ embeds: [errorEmbed('Bilgi değiştirme işlemi sırasında bir hata oluştu.')], ephemeral: true });
        }
    }
};
