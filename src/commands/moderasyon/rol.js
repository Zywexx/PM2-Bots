const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rol')
        .setDescription('Kullanıcıya rol verir veya kullanıcıdan rol alır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(subcommand =>
            subcommand
                .setName('ver')
                .setDescription('Belirtilen kullanıcıya bir rol verir.')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('Rol verilecek kullanıcı')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Verilecek rol')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('al')
                .setDescription('Belirtilen kullanıcıdan bir rol alır.')
                .addUserOption(option =>
                    option.setName('kullanici')
                        .setDescription('Rolü alınacak kullanıcı')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Alınacak rol')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getUser('kullanici');
            const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            const role = interaction.options.getRole('rol');

            if (!targetMember) {
                return interaction.reply({
                    embeds: [errorEmbed('Kullanıcı Bulunamadı', 'Belirtilen kullanıcı sunucuda bulunamadı.')],
                    ephemeral: true
                });
            }

            // Bot ve Rol Hiyerarşisi Kontrolleri
            const botMember = interaction.guild.members.me;
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [errorEmbed('Yetki Yetersiz', 'Bu rol botun en yüksek rolünden eşit veya daha üstte olduğu için işlem yapılamaz.')],
                    ephemeral: true
                });
            }

            // Komutu kullanan yetkilinin hiyerarşi kontrolü (Sunucu sahibi muaf)
            if (interaction.guild.ownerId !== interaction.user.id) {
                if (role.position >= interaction.member.roles.highest.position) {
                    return interaction.reply({
                        embeds: [errorEmbed('Yetki Yetersiz', 'Kendi en yüksek rolünüzden eşit veya daha üstteki bir rolü veremez veya alamazsınız.')],
                        ephemeral: true
                    });
                }
            }

            if (role.managed) {
                return interaction.reply({
                    embeds: [errorEmbed('Özel Rol', 'Bu rol bir entegrasyon veya bot rolü olduğu için manuel olarak verilemez/alınamaz.')],
                    ephemeral: true
                });
            }

            if (subcommand === 'ver') {
                if (targetMember.roles.cache.has(role.id)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Zaten Mevcut', `<@${targetMember.id}> kullanıcısı zaten **${role.name}** rolüne sahip.`)],
                        ephemeral: true
                    });
                }

                await targetMember.roles.add(role, `Yetkili: ${interaction.user.tag}`);
                logger.info(`${interaction.user.tag} tarafından ${targetMember.user.tag} kullanıcısına ${role.name} rolü verildi.`, 'ROL');

                return interaction.reply({
                    embeds: [successEmbed('Rol Verildi', `<@${targetMember.id}> kullanıcısına başarıyla **${role.name}** rolü verildi.`)],
                    ephemeral: true
                });
            } else if (subcommand === 'al') {
                if (!targetMember.roles.cache.has(role.id)) {
                    return interaction.reply({
                        embeds: [errorEmbed('Rol Bulunmuyor', `<@${targetMember.id}> kullanıcısında zaten **${role.name}** rolü bulunmuyor.`)],
                        ephemeral: true
                    });
                }

                await targetMember.roles.remove(role, `Yetkili: ${interaction.user.tag}`);
                logger.info(`${interaction.user.tag} tarafından ${targetMember.user.tag} kullanıcısından ${role.name} rolü alındı.`, 'ROL');

                return interaction.reply({
                    embeds: [successEmbed('Rol Alındı', `<@${targetMember.id}> kullanıcısından başarıyla **${role.name}** rolü alındı.`)],
                    ephemeral: true
                });
            }
        } catch (error) {
            logger.error(`Rol komutunda hata: ${error.message}`, 'ROL', error);
            return interaction.reply({
                embeds: [errorEmbed('Hata', `Rol işlemi gerçekleştirilirken bir hata oluştu: ${error.message}`)],
                ephemeral: true
            });
        }
    }
};
