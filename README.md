<div align="center">

# 🤖 PM2 Bots

**Discord Sunucuları için Profesyonel & Modüler Çift Bot Sistemi**

[![Discord.js](https://img.shields.io/badge/discord.js-v14.17+-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![PM2](https://img.shields.io/badge/PM2-Process%20Manager-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
*Geliştirici: **Zywexx** (787 INC) · 7/24 Kesintisiz Process Altyapısı*

</div>

---

## 📖 İçindekiler

- [Hakkında](#-hakkında)
- [Neden Çift Bot Mimarisi?](#-neden-çift-bot-mimarisi)
- [Özellikler](#-özellikler)
  - [📝 Kayıt Botu](#-kayıt-botu)
  - [🔨 Moderasyon Botu](#-moderasyon-botu)
  - [⚡ Genel & Altyapı Özellikleri](#-genel--altyapı-özellikleri)
- [Sistem Mimarisi](#-sistem-mimarisi)
- [Proje Dosya Yapısı](#-proje-dosya-yapısı)
- [Gereksinimler](#-gereksinimler)
- [Kurulum Adımları](#-kurulum-adımları)
- [Yapılandırma](#-yapılandırma)
  - [.env Dosyası](#env-dosyası)
  - [config.json Ayarları](#configjson-ayarları)
- [Slash Komutları](#-slash-komutları)
  - [Kayıt Komutları](#kayıt-komutları)
  - [Moderasyon Komutları](#moderasyon-komutları)
  - [Genel Komutlar](#genel-komutlar)
- [Veritabanı ve Yedekleme](#-veritabanı-ve-yedekleme)
- [PM2 Süreç Yönetimi](#-pm2-süreç-yönetimi)
- [Sorun Giderme (FAQ)](#-sorun-giderme-faq)
- [Geliştirici](#-geliştirici)
- [Katkıda Bulunma & Lisans](#-katkıda-bulunma--lisans)

---

## 🌟 Hakkında

**PM2 Bots**, yoğun ve aktif Discord sunucularının operasyonel yükünü hafifletmek için tasarlanmış **çift bot (Dual-Process)** mimarisine sahip modern bir yönetim altyapısıdır. 

Sistem iki temel processten oluşur:
1. **Kayıt Botu (`palik-kayit-bot`)**: Sunucuya yeni katılan üyelerin karşılanması, cinsiyet/yaş/isim doğrulaması, yetkili kayıt istatistikleri ve Findcord doğrulaması ile ilgilenir.
2. **Moderasyon Botu (`palik-moderasyon-bot`)**: Ban, kick, jail, mute, timeout, uyarı, kanal yönetimi, otomatik sicil ve ceza eskalasyonu ile otomatik yedekleme görevlerini yürütür.

Her iki bot, **SQLite WAL (Write-Ahead Logging)** modu sayesinde ortak bir veritabanını kilitlenme riski olmadan yüksek performansla eşzamanlı olarak paylaşır.

---

## 💡 Neden Çift Bot Mimarisi?

* **İzolasyon & Yüksek Erişilebilirlik:** Moderasyon işlemleri sırasında yaşanabilecek yoğunluk veya API darboğazları kayıt sürecini aksatmaz.
* **Bağımsız Bakım:** Bir bot güncellenip yeniden başlatılırken diğeri 0 kesintiyle hizmet vermeye devam eder.
* **Kaynak Optimizasyonu:** PM2 ile her process için ayrı bellek limitleri ve çökme koruması tanımlanır.
* **Yetki & Güvenlik Ayrımı:** Kayıt ve Moderasyon bot token'ları ile izinleri birbirinden bağımsız yönetilir.

---

## ✨ Özellikler

### 📝 Kayıt Botu
* 🗂️ **Akıllı Kayıt:** Üye adı, yaşı ve cinsiyetine göre rol ataması ve sunucu içi otomatik takma ad (`Tag + İsim | Yaş`) güncellemesi.
* 🔍 **Kayıt Sorgulama:** Kullanıcının sunucudaki tüm kayıt geçmişini ve kim tarafından kaydedildiğini listeleme.
* ✏️ **Bilgi Güncelleme:** Kayıtlı üyenin isim, yaş veya cinsiyet bilgilerini güncelleme ve tarihçesini kaydetme.
* 🏆 **Dönemsel Sıralama:** Günlük, haftalık, aylık veya tüm zamanlar bazında en çok kayıt yapan yetkililer tablosu.
* 🔄 **Sıralama Sıfırlama:** Yetkili kontrolünde kayıt puanlarını dönemsel olarak sıfırlama mekanizması.
* 👋 **Hoş Geldin & Bilgilendirme:** Yeni üye geldiğinde güvenlik kontrolü ve kayıt kanalına bilgilendirme mesajı.
* 🛡️ **Şüpheli Hesap Koruması:** 7 günden önce açılmış hesaplara otomatik şüpheli hesap bildirimi.

### 🔨 Moderasyon Botu
* 🚫 **Kapsamlı Ceza Sistemi:** Ban, Unban, Kick, Timeout, Mute (rol bazlı), Jail (cezalı rolü) ve Warn desteği.
* ⏱️ **Süreli Ceza Takibi:** Süreli Mute, Jail ve Timeout cezaları bot/sunucu yeniden başlasa bile veritabanından kurtarılır ve zamanı gelince otomatik kaldırılır.
* 📜 **Gelişmiş Sicil (Ceza Puanı) Yönetimi:** Her cezanın bir puan karşılığı vardır. Sicil geçmişi detaylıca saklanır ve incelenebilir.
* 📈 **Otomatik Eskalasyon:** Belirli bir ceza limitini (örn. 5 mute, 2 ban) aşan kullanıcılar belirlenen eskalasyon kanalına otomatik raporlanır.
* 🧹 **Mesaj Temizleme & Snipe:** `/sil` ile toplu mesaj temizliği ve `/snipe` ile son silinen mesajın içeriğini görüntüleme.
* 🔒 **Kanal Güvenliği:** `/kilit`, `/kilit_ac` ve `/yavasmod` ile kanal akışını tam kontrol altına alma.
* 🎭 **Hızlı Rol Yönetimi:** `/rol` komutu ile tek tıkla rol verip alma.
* 📊 **Bot Durumu:** Bellek kullanımı, uptime süresi ve ping metriklerini `/bot_durum` ile anlık izleme.
* 🌐 **Findcord Entegrasyonu:** Kullanıcıların Findcord sicil puanını ve geçmişini Discord içerisinden sorgulama.

### ⚡ Genel & Altyapı Özellikleri
* 🗄️ **SQLite WAL Modu:** `better-sqlite3` ile ultra hızlı okuma ve yazma; eşzamanlı multi-process güvenliği.
* 💾 **Otomatik Gece Yedekleme:** `node-cron` ile her gece saat `03:00`'te veritabanının otomatik yedeğinin alınması ve loglanması.
* 🔁 **PM2 Entegrasyonu:** Çökme anında otomatik yeniden başlama (`autorestart`) ve bellek limiti aşımında koruma (`max_memory_restart`).
* 🎨 **Tutarlı Embed Tasarımı:** Hata, başarı, ceza ve bilgilendirme durumları için tek tip şık Discord Embed tasarımları.

---

## 🏗️ Sistem Mimarisi

```
                                 ┌─────────────────────────┐
                                 │     Discord Sunucusu    │
                                 └────────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
           ┌──────────▼───────────┐                       ┌───────────▼───────────┐
           │   palik-kayit-bot    │                       │  palik-moderasyon-bot │
           │   (Kayıt & Profil)   │                       │   (Ceza & Güvenlik)   │
           └──────────┬───────────┘                       └───────────┬───────────┘
                      │                                               │
                      │       ┌───────────────────────────────┐       │
                      ├──────►│     SQLite: database.db       │◄──────┤
                      │       │     (WAL Eşzamanlı Mod)       │       │
                      │       └───────────────────────────────┘       │
                      │                                               │
                      │       ┌───────────────────────────────┐       │
                      └──────►│         config.json           │◄──────┘
                              │      (Kanal, Rol & Ceza)      │
                              └───────────────────────────────┘
```

---

## 📁 Proje Dosya Yapısı

```
PM2 Bots/
├── 📄 ecosystem.config.js         # PM2 process yapılandırma dosyası
├── 📄 package.json                # Proje bağımlılıkları ve çalıştırma komutları
├── 📄 config.json                 # Sunucu kanal, rol, izin ve ceza puanı ayarları
├── 📄 .env                        # Discord Bot Token'ları ve API anahtarları (Gizli)
├── 📄 .env.example                # Çevre değişkenleri örnek şablonu
├── 📄 database.db                 # SQLite ana veritabanı dosyası
├── 📄 README.md                   # Dokümantasyon
│
├── 📁 backups/                    # Otomatik ve manuel veritabanı yedekleri (.db)
├── 📁 logs/                       # Sistem ve işlem log kayıtları
│
└── 📁 src/
    ├── 📄 kayit-bot.js            # Kayıt botu ana çalışma dosyası
    ├── 📄 moderasyon-bot.js       # Moderasyon botu ana çalışma dosyası
    ├── 📄 deploy-kayit.js         # Kayıt botu slash komutlarını Discord'a yükler
    ├── 📄 deploy-moderasyon.js    # Moderasyon botu slash komutlarını Discord'a yükler
    ├── 📄 deploy-commands.js      # Genel komut dağıtım betiği
    │
    ├── 📁 commands/               # Slash Komutları
    │   ├── 📁 genel/              # Her iki botta veya ortak komutlar
    │   │   ├── avatar.js          # Kullanıcı avatarını gösterir
    │   │   ├── kullanici_bilgi.js # Üye sunucu ve profil bilgileri
    │   │   ├── sunucu_bilgi.js    # Sunucu genel istatistikleri
    │   │   └── yardim.js          # İnteraktif yardım menüsü
    │   │
    │   ├── 📁 kayit/              # Kayıt Botu Komutları
    │   │   ├── kayit.js           # Üyeyi isim/yaş/cinsiyet ile kaydeder
    │   │   ├── kayit_bilgi_degistir.js # Kayıt verilerini günceller
    │   │   ├── kayit_siralama.js  # Yetkili kayıt istatistik sıralaması
    │   │   ├── kayit_siralama_sifirla.js # Sıralama tablosunu sıfırlar
    │   │   └── kayit_sorgu.js     # Kullanıcının kayıt geçmişini listeler
    │   │
    │   └── 📁 moderasyon/         # Moderasyon Botu Komutları
    │       ├── ban.js / unban.js  # Yasaklama ve yasak kaldırma
    │       ├── kick.js            # Sunucudan atma
    │       ├── mute.js / unmute.js # Rol bazlı süreli/süresiz susturma
    │       ├── jail.js / unjail.js # Cezalı rolüne gönderme / çıkarma
    │       ├── timeout.js / untimeout.js # Discord yerel timeout yönetimi
    │       ├── warn.js / warns.js # Uyarı verme ve uyarıları listeleme
    │       ├── sicil.js           # Kullanıcı ceza sicil özeti
    │       ├── sicil_temizle.js   # Ceza veya sicil sıfırlama
    │       ├── sil.js             # Toplu mesaj temizleme
    │       ├── snipe.js           # Son silinen mesajı okuma
    │       ├── kilit.js / kilit_ac.js # Kanal kilit açma/kapama
    │       ├── yavasmod.js        # Kanala yavaş mod süresi uygulama
    │       ├── rol.js             # Kullanıcıya rol verme/alma
    │       ├── bot_durum.js       # Bot kaynak kullanım ve uptime durumu
    │       ├── yedek_al.js        # Manuel SQLite veritabanı yedeği
    │       └── findcord_sorgu.js / findcord_durum.js # Findcord sorguları
    │
    ├── 📁 events/                 # Discord Olay Dinleyicileri (Event Listeners)
    │   ├── 📁 kayit/              # Kayıt botu olayları (ready, guildMemberAdd, interactionCreate)
    │   └── 📁 moderasyon/         # Moderasyon olayları (ready, messageDelete, interactionCreate)
    │
    ├── 📁 services/               # İş Mantığı Servisleri
    │   ├── penalService.js        # Ceza hesaplama, ceza sonlandırma & eskalasyon
    │   ├── registrationService.js # Kayıt CRUD ve dönemsel istatistikler
    │   ├── backupService.js       # SQLite sıcak yedekleme ve cron yöneticisi
    │   └── findcordService.js     # Findcord API istek yöneticisi
    │
    ├── 📁 database/               # Veritabanı Katmanı
    │   ├── db.js                  # better-sqlite3 WAL bağlantısı
    │   └── schema.sql             # Tablo ve indeks tanımları
    │
    └── 📁 utils/                  # Yardımcı Araçlar
        ├── embeds.js              # Standart Discord Embed şablonları
        ├── logger.js              # Seviyeli ve renkli loglama modülü
        ├── permissions.js         # Rol ve yetki doğrulama motoru
        └── time.js                # Zaman damgaları ve süre ayrıştırıcı
```

---

## 📋 Gereksinimler

* **Node.js**: v18.0.0 veya üstü (Önerilen: v20 LTS)
* **npm**: v9.0.0 veya üstü
* **PM2**: Global olarak kurulu (`npm install -g pm2`)
* **İşletim Sistemi**: Linux (Ubuntu, Debian, CentOS) veya Windows Server / Windows 10/11

### 🔑 Discord Developer Portal Ayarları

Her iki bot için (Kayıt ve Moderasyon) Discord Developer Portal'dan şu **Privileged Gateway Intents** açılmalıdır:
1. **Server Members Intent** (Açık olmalı)
2. **Message Content Intent** (Moderasyon botu snipe komutu için açık olmalı)

---

## 🚀 Kurulum Adımları

### 1. Depoyu İndirin / Klonlayın
```bash
git clone https://github.com/Zywexx/PM2-Bots
cd "PM2 Bots"
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Tanımlayın
```bash
# Windows PowerShell için:
Copy-Item .env.example .env

# Linux / MacOS için:
cp .env.example .env
```
`.env` dosyasını açıp bot token'larını ve sunucu ID'nizi girin.

### 4. `config.json` Ayarlarını Yapın
Sunucunuzdaki kanal ve rol ID'lerini `config.json` dosyasına ekleyin.

### 5. Slash Komutlarını Discord'a Tanıtın
```bash
# Tüm komutları tek seferde deploy etmek için:
npm run deploy:all

# Veya ayrı ayrı:
npm run deploy:kayit
npm run deploy:moderasyon
```

### 6. PM2 ile Botları Başlatın
```bash
npm run pm2:start
```

---

## ⚙️ Yapılandırma

### `.env` Dosyası

```env
# 1. KAYIT BOTU
KAYIT_BOT_TOKEN=OTkx...BOT_TOKEN_BURAYA
KAYIT_CLIENT_ID=123456789012345678

# 2. MODERASYON BOTU
MOD_BOT_TOKEN=MTAy...BOT_TOKEN_BURAYA
MOD_CLIENT_ID=123456789012345679

# 3. ORTAK SUNUCU BİLGİSİ
DISCORD_GUILD_ID=123456789012345670

# 4. FINDCORD ENTEGRASYONU (İsteğe Bağlı)
FINDCORD_API_KEY=fc_live_...
FINDCORD_BASE_URL=https://app.findcord.com/v1

# 5. DEBUG MODU (true/false)
DEBUG=false
```

### `config.json` Ayarları

`config.json` dosyası roller, kanallar, ceza puanları ve limitlerini belirler:

```json
{
  "tag": "|",
  "footer": "PM2 Bots",
  "minAge": 15,
  "channels": {
    "karsilama": "KANAL_ID",
    "admin_hosgeldin": "KANAL_ID",
    "kayit_log": "KANAL_ID",
    "ceza_log": "KANAL_ID",
    "eskalasyon_log": "KANAL_ID",
    "hata_log": "KANAL_ID",
    "yedek_log": "KANAL_ID"
  },
  "roles": {
    "kayitsiz": "ROL_ID",
    "erkek": "ROL_ID",
    "kiz": "ROL_ID"
  },
  "permissions": {
    "kayit_yapabilir": ["ROL_ID"],
    "kayit_sifirlama": ["ROL_ID"],
    "sicil_temizle": ["ROL_ID"]
  },
  "penals": {
    "ban": { "points": 10, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 2, "escalation_action": "notify" },
    "jail": { "points": 7, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 3, "escalation_action": "notify", "roles": ["CEZALI_ROL_ID"] },
    "kick": { "points": 5, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 0, "escalation_action": "notify" },
    "mute": { "points": 3, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 5, "escalation_action": "notify", "roles": ["MUTED_ROL_ID"] },
    "warn": { "points": 1, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 5, "escalation_action": "notify" },
    "timeout": { "points": 2, "staff": ["ROL_ID"], "log": "KANAL_ID", "limit": 0, "escalation_action": "notify" }
  }
}
```

---

## 📜 Slash Komutları

### Kayıt Komutları
| Komut | Parametreler | Yetki | Açıklama |
|---|---|---|---|
| `/kayit` | `uye`, `isim`, `yas`, `cinsiyet` | `kayit_yapabilir` | Üyeyi kaydeder, rol verir ve ismini düzenler. |
| `/kayit_sorgu` | `uye` | Herkes | Bir kullanıcının sunucudaki kayıt geçmişini görüntüler. |
| `/kayit_bilgi_degistir` | `uye`, `yeni_isim`, `yeni_yas`, `yeni_cinsiyet` | `kayit_yapabilir` | Kayıtlı üyenin profil bilgilerini günceller. |
| `/kayit_siralama` | `[donem: gunluk/haftalik/aylik/toplam]` | Herkes | Yetkililerin kayıt yapma istatistik lider tablosunu gösterir. |
| `/kayit_siralama_sifirla` | - | `kayit_sifirlama` | Kayıt liderlik tablosunu onay ile sıfırlar. |

### Moderasyon Komutları
| Komut | Parametreler | Yetki | Açıklama |
|---|---|---|---|
| `/ban` | `uye`, `sebep` | `ban.staff` | Kullanıcıyı sunucudan yasaklar ve sicile işler. |
| `/unban` | `kullanici_id`, `sebep` | `ban.staff` | Kullanıcının sunucu yasağını kaldırır. |
| `/kick` | `uye`, `sebep` | `kick.staff` | Kullanıcıyı sunucudan atar. |
| `/mute` | `uye`, `sure`, `sebep` | `mute.staff` | Kullanıcıya mute rolü verir (Süreli/Süresiz). |
| `/unmute` | `uye`, `sebep` | `mute.staff` | Kullanıcının mute cezasını kaldırır. |
| `/jail` | `uye`, `sure`, `sebep` | `jail.staff` | Kullanıcıyı cezalı rolüne gönderir (Süreli/Süresiz). |
| `/unjail` | `uye`, `sebep` | `jail.staff` | Kullanıcıyı hapishaneden çıkarıp eski rollerini iade eder. |
| `/timeout` | `uye`, `sure`, `sebep` | `timeout.staff` | Discord yerel timeout uygular. |
| `/untimeout` | `uye`, `sebep` | `timeout.staff` | Discord yerel timeout cezasını kaldırır. |
| `/warn` | `uye`, `sebep` | `warn.staff` | Kullanıcıya uyarı verir, sicil puanını artırır. |
| `/warns` | `uye` | `warn.staff` | Kullanıcının aldığı aktif uyarıları listeler. |
| `/sicil` | `uye` | Herkes | Kullanıcının ceza geçmişini ve toplam ceza puanını gösterir. |
| `/sicil_temizle` | `uye`, `[ceza_id]` | `sicil_temizle` | Belirli bir cezayı veya üyenin tüm sicilini siler. |
| `/sil` | `adet` (1-100) | Kanalı Yönet | Belirtilen sayıda mesajı topluca siler. |
| `/snipe` | - | Herkes | Kanalda son silinen mesajı görüntüler. |
| `/kilit` | `[sebep]` | Kanalı Yönet | Kanalı mesaj gönderimine kilitler. |
| `/kilit_ac` | `[sebep]` | Kanalı Yönet | Kilitli kanalın yazma iznini geri açar. |
| `/yavasmod` | `sure` (0-21600 sn) | Kanalı Yönet | Kanala yavaş mod gecikmesi uygular. |
| `/rol` | `islem`, `uye`, `rol` | Rolleri Yönet | Kullanıcıya tek işlemde rol verir veya alır. |
| `/bot_durum` | - | Herkes | Botların RAM kullanımı, ping ve çalışma sürelerini gösterir. |
| `/yedek_al` | - | Yönetici | Anlık SQLite veritabanı yedeği oluşturur. |
| `/findcord_sorgu` | `uye` | Yetkili | Findcord veritabanı üzerinden kullanıcı sicilini sorgular. |
| `/findcord_durum` | - | Yetkili | Findcord API bağlantı durumunu kontrol eder. |

### Genel Komutlar
| Komut | Parametreler | Yetki | Açıklama |
|---|---|---|---|
| `/yardim` | - | Herkes | Kategori seçim menülü kapsamlı komut rehberi. |
| `/avatar` | `[uye]` | Herkes | Kullanıcının avatarını yüksek çözünürlüklü gösterir. |
| `/kullanici_bilgi` | `[uye]` | Herkes | Hesap oluşturma, sunucuya katılma ve rol bilgileri. |
| `/sunucu_bilgi` | - | Herkes | Sunucu üye dağılımı, kanal sayıları ve özellikleri. |

> ⏱️ **Süre Formatları:** `30s` (saniye), `15m` (dakika), `2h` (saat), `1d` (gün), `1w` (hafta)

---

## 🗄️ Veritabanı ve Yedekleme

Sistem, `better-sqlite3` sürücüsüyle çalışan **SQLite** veritabanına sahiptir.

### Tablo Şeması
* **`registrations`**: Sunucuya kayıt olan üyelerin isim, yaş, cinsiyet ve kayıt eden yetkili bilgileri.
* **`registration_history`**: Kayıt bilgilerindeki isim/yaş değişikliklerinin kayıt günlüğü.
* **`registration_stats`**: Yetkili bazlı dönemsel (günlük, haftalık, aylık, genel) kayıt sayaçları.
* **`penalties`**: Ban, mute, jail, kick, warn, timeout kayıtları, süreleri, ceza puanları ve durumları (`active`/`completed`/`cancelled`).

### Otomatik & Sıcak Yedekleme
* **Zamanlanmış Yedekleme:** `backupService.js` modülü, her gece saat `03:00`'te SQLite `VACUUM INTO` veya sıcak dosya kopyalama ile veritabanını `backups/` klasörüne arşivler.
* **Loglama:** Alınan yedekler `config.json` içerisindeki `yedek_log` kanalına anlık bildirilir.
* **Manuel Yedek:** İstendiği an `/yedek_al` komutu ile anlık yedek alınabilir.

---

## 🔧 PM2 Süreç Yönetimi

Botlar `ecosystem.config.js` dosyası ile PM2 üzerinde process olarak yönetilir:

```bash
# Botları başlat
npm run pm2:start

# Botları yeniden başlat
npm run pm2:restart

# Botları durdur
npm run pm2:stop

# Canlı log akışını takip et
npm run pm2:logs

# Process durumunu ve bellek kullanımını incele
pm2 status

# Sunucu yeniden başladığında otomatik çalışması için:
pm2 startup
pm2 save
```

### PM2 Process İsimleri:
* **Kayıt Botu:** `palik-kayit-bot`
* **Moderasyon Botu:** `palik-moderasyon-bot`

Her process maksimum **300 MB** bellek limiti ile sınırlandırılmıştır; bu limit aşılırsa PM2 botu otomatik olarak yeniden başlatır.

---

## 🛠️ Sorun Giderme (FAQ)

### ❓ `Used disallowed intents` hatası alıyorum, bot başlamıyor?
* Discord Developer Portal'a gidin.
* İlgili bot uygulamasını seçin ➔ **Bot** sekmesine tıklayın.
* **Privileged Gateway Intents** başlığı altındaki **Server Members Intent** ve **Message Content Intent** seçeneklerini aktif edin ve kaydedin.

### ❓ Slash komutları Discord'da gözükmüyor?
* `npm run deploy:all` komutunu çalıştırarak komutları sunucuya tekrar kaydedin.
* Komutların Discord istemcisine yansıması bazen istemciyi yeniden başlatmayı (`Ctrl + R`) gerektirebilir.

### ❓ Bot rol verirken veya banlarken `Missing Permissions` hatası veriyor?
* Discord sunucu ayarlarında **Roller** menüsünü açın.
* PM2 Bot'un sahip olduğu en yüksek rolü, işlem yapacağı (muteli, cezalı, üye vb.) tüm rollerin **üst sırasına** taşıyın.

### ❓ `SQLITE_BUSY: database is locked` hatası oluşur mu?
* Hayır. Sistem `better-sqlite3` üzerinde **WAL (Write-Ahead Logging)** modunda çalışır. Birden fazla process aynı anda okuma ve yazma yapabilir.

---

## 👨‍💻 Geliştirici

Bu proje **Zywexx** (**787 INC**) tarafından tasarlanmış ve geliştirilmiştir.

| Bilgi | Detay |
|---|---|
| **Geliştirici** | Zywexx |
| **Organizasyon** | 787 INC |
| **Proje** | PM2 Bots (Discord Çift Bot Mimarisi) |
| **Sürüm** | v2.0.0 |
| **Teknoloji Yığını** | Node.js, discord.js v14, better-sqlite3 (WAL), PM2 |

---

## 🤝 Katkıda Bulunma & Lisans

1. Projeyi çatallayın (Fork).
2. Yeni bir özellik dalı oluşturun: `git checkout -b feature/yeni-ozellik`
3. Değişikliklerinizi commit'leyin: `git commit -m 'feat: yeni özellik'`
4. Dalınıza push yapın: `git push origin feature/yeni-ozellik`
5. Bir **Pull Request** açın.

Bu proje [GPL-3.0](LICENSE) altında lisanslanmıştır.

<div align="center">

**PM2 Bots** — *Güçlü, Hızlı ve Güvenilir Discord Yönetim Altyapısı*

*By **Zywexx** — **787 INC***

</div>
