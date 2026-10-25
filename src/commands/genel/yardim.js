const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType
} = require('discord.js');
const config = require('../../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Botun tüm komutlarını ve kullanım detaylarını listeler.'),

    async execute(interaction) {
        try {
            const footerText = config.footer || '787 INC By Zywexx';

            // Ana Karşılama Embed'i
            const mainEmbed = new EmbedBuilder()
                .setTitle('📚 787 INC By Zywexx — Komut & Yardım Rehberi')
                .setColor('#5865F2')
                .setDescription('Aşağıdaki seçim menüsünden incelemek istediğiniz komut kategorisini seçebilirsiniz.\n\n' +
                    '🔹 **📝 Kayıt Komutları:** Sunucu üye kayıt sistemi\n' +
                    '🔹 **🔨 Moderasyon Komutları:** Ceza ve kanal yönetim araçları\n' +
                    '🔹 **🌐 Findcord & Sicil:** Kullanıcı geçmişi ve Findcord sorguları\n' +
                    '🔹 **ℹ️ Genel & Bilgi:** Sunucu ve kullanıcı bilgi komutları\n')
                .setThumbnail(interaction.client.user.displayAvatarURL())
                .setFooter({ text: footerText })
                .setTimestamp();

            // Kategori Embed'leri
            const embeds = {
                kayit: new EmbedBuilder()
                    .setTitle('📝 Kayıt Sistemi Komutları')
                    .setColor('#3498DB')
                    .setDescription('Yetkililerin kullanıcıları sunucuya kaydetmesini ve kayıt geçmişini yönetmesini sağlar.')
                    .addFields(
                        { name: '`/kayit <kullanici> <cinsiyet> <isim> <yas> [tag]`', value: 'Yeni gelen kullanıcıyı kayıt eder ve cinsiyet rollerini tanımlar.', inline: false },
                        { name: '`/kayit_bilgi_degistir <kullanici> [isim] [yas] [cinsiyet]`', value: 'Kayıtlı kullanıcının bilgilerini günceller ve geçmişe işler.', inline: false },
                        { name: '`/kayit_sorgu <kullanici>`', value: 'Kullanıcının sunucudaki kayıt geçmişini ve bilgilerini görüntüler.', inline: false },
                        { name: '`/kayit_siralama [periyot]`', value: 'Yetkililerin kayıt sayılarına göre liderlik tablosunu gösterir.', inline: false },
                        { name: '`/kayit_siralama_sifirla [yetkili]`', value: 'Kayıt istatistiklerini sıfırlar (Yönetici yetkisi gerektirir).', inline: false }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp(),

                moderasyon: new EmbedBuilder()
                    .setTitle('🔨 Moderasyon & Ceza Komutları')
                    .setColor('#ED4245')
                    .setDescription('Sunucu düzenini korumak için ceza ve moderasyon araçları.')
                    .addFields(
                        { name: '`/ban <kullanici> [sebep]`', value: 'Kullanıcıyı sunucudan yasaklar.', inline: true },
                        { name: '`/unban <kullanici_id> [sebep]`', value: 'Kullanıcının yasağını kaldırır.', inline: true },
                        { name: '`/kick <kullanici> [sebep]`', value: 'Kullanıcıyı sunucudan atar.', inline: true },
                        { name: '`/jail <kullanici> [sure] [sebep]`', value: 'Kullanıcıyı cezalıya (Jail) atar.', inline: true },
                        { name: '`/unjail <kullanici> [sebep]`', value: 'Kullanıcıyı Jail\'den çıkarır.', inline: true },
                        { name: '`/mute <kullanici> [sure] [sebep]`', value: 'Kullanıcıya susturma (Mute) rolü verir.', inline: true },
                        { name: '`/unmute <kullanici> [sebep]`', value: 'Kullanıcının susturmasını kaldırır.', inline: true },
                        { name: '`/timeout <kullanici> <dakika> [sebep]`', value: 'Kullanıcıya zamanaşımı (Timeout) uygular.', inline: true },
                        { name: '`/untimeout <kullanici> [sebep]`', value: 'Zamanaşımını kaldırır.', inline: true },
                        { name: '`/warn <kullanici> <sebep>`', value: 'Kullanıcıya resmi uyarı verir.', inline: true },
                        { name: '`/warns <kullanici>`', value: 'Kullanıcının uyarılarını listeler.', inline: true },
                        { name: '`/sil <miktar> [kullanici] [botlar]`', value: 'Kanalda 1-100 arası mesajı toplu siler.', inline: true },
                        { name: '`/kilit [durum] [sebep]`', value: 'Kanalı mesaj yazımına kapatır veya açar.', inline: true },
                        { name: '`/kilit_ac [sebep]`', value: 'Kilitli kanalı anında mesaj yazımına açar.', inline: true },
                        { name: '`/yavasmod <sure> [sebep]`', value: 'Kanal yavaş modunu (Slowmode) ayarlar.', inline: true },
                        { name: '`/rol <ver/al> <kullanici> <rol>`', value: 'Kullanıcıya güvenli şekilde rol verir/alır.', inline: true },
                        { name: '`/snipe [kanal]`', value: 'Kanalda en son silinen mesajı gösterir.', inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp(),

                findcord: new EmbedBuilder()
                    .setTitle('🌐 Findcord & Sicil Araçları')
                    .setColor('#9B59B6')
                    .setDescription('Kullanıcıların yerel ve genel Findcord sicil/sunucu sorgulama araçları.')
                    .addFields(
                        { name: '`/sicil <kullanici>`', value: 'Kullanıcının sunucudaki tüm ceza puanlarını ve ceza geçmişini gösterir.', inline: false },
                        { name: '`/sicil_temizle <kullanici> [sebep]`', value: 'Kullanıcının sunucu ceza sicilini temizler (Yönetici).', inline: false },
                        { name: '`/findcord_sorgu <kullanici_id>`', value: 'Findcord API üzerinden kullanıcının diğer sunuculardaki sicil, kayıt ve yetkili geçmişini sorgular.', inline: false },
                        { name: '`/findcord_durum`', value: 'Findcord API bağlantı ve rate-limit durumunu görüntüler.', inline: false },
                        { name: '`/yedek_al`', value: 'Veritabanının anlık güvenli yedeğini alır ve kanala yükler.', inline: false }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp(),

                genel: new EmbedBuilder()
                    .setTitle('ℹ️ Genel & Bilgi Komutları')
                    .setColor('#2ECC71')
                    .setDescription('Sunucu ve kullanıcı hakkında detaylı bilgi edinme araçları.')
                    .addFields(
                        { name: '`/yardim`', value: 'Bu yardım menüsünü açar.', inline: true },
                        { name: '`/sunucu_bilgi`', value: 'Sunucu istatistiklerini, kanal/rol/üye sayılarını ve boost durumunu gösterir.', inline: true },
                        { name: '`/kullanici_bilgi [kullanici]`', value: 'Kullanıcının profil, katılım tarihi ve rol detaylarını gösterir.', inline: true },
                        { name: '`/avatar [kullanici]`', value: 'Kullanıcının genel ve sunucu profil fotoğrafını yüksek çözünürlükte gösterir.', inline: true },
                        { name: '`/bot_durum`', value: 'Botun gecikme (ping), bellek kullanımı ve veritabanı boyutunu görüntüler.', inline: true }
                    )
                    .setFooter({ text: footerText })
                    .setTimestamp()
            };

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('yardim_select')
                .setPlaceholder('Kategori seçmek için tıklayın...')
                .addOptions(
                    {
                        label: 'Ana Menü',
                        description: 'Yardım ana paneline geri döner',
                        value: 'ana_menu',
                        emoji: '🏠'
                    },
                    {
                        label: 'Kayıt Komutları',
                        description: 'Üye kayıt ve kayıt yönetimi komutları',
                        value: 'kayit',
                        emoji: '📝'
                    },
                    {
                        label: 'Moderasyon Komutları',
                        description: 'Ban, jail, mute, sil, kilit, yavaş mod ve rol işlemleri',
                        value: 'moderasyon',
                        emoji: '🔨'
                    },
                    {
                        label: 'Findcord & Sicil',
                        description: 'Sicil kontrolü ve Findcord genel sorgu araçları',
                        value: 'findcord',
                        emoji: '🌐'
                    },
                    {
                        label: 'Genel & Bilgi',
                        description: 'Sunucu, kullanıcı, avatar ve bot istatistikleri',
                        value: 'genel',
                        emoji: 'ℹ️'
                    }
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.reply({
                embeds: [mainEmbed],
                components: [row]
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 120000 // 2 dakika aktif
            });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: 'Bu yardım menüsünü sadece komutu kullanan kişi yönlendirebilir.',
                        ephemeral: true
                    });
                }

                const selectedValue = i.values[0];
                if (selectedValue === 'ana_menu') {
                    await i.update({ embeds: [mainEmbed], components: [row] });
                } else if (embeds[selectedValue]) {
                    await i.update({ embeds: [embeds[selectedValue]], components: [row] });
                }
            });

            collector.on('end', async () => {
                const disabledMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
                const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
                await interaction.editReply({ components: [disabledRow] }).catch(() => {});
            });
        } catch (error) {
            const { errorEmbed } = require('../../utils/embeds');
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed('Hata', `Yardım menüsü yüklenirken bir sorun oluştu: ${error.message}`)], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed('Hata', `Yardım menüsü yüklenirken bir sorun oluştu: ${error.message}`)], ephemeral: true });
            }
        }
    }
};

