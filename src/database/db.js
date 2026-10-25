const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../../database.db');
const schemaPath = path.join(__dirname, 'schema.sql');

const db = new Database(dbPath);

// Journal modu: DELETE — WAL/SHM dosyası oluşmaz, DB her zaman tek dosya kalır
db.pragma('journal_mode = DELETE');
// Performans ayarları
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -8000');   // 8 MB önbellek

function initialize() {
    try {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        console.log('[Veritabanı] Tablolar başarıyla kontrol edildi ve oluşturuldu.');
    } catch (error) {
        console.error('[Veritabanı Hatası] Şema yüklenirken bir hata oluştu:', error);
        throw error;
    }
}

/**
 * WAL checkpoint yaparak tüm WAL verilerini database.db'ye yazar,
 * ardından veritabanı bağlantısını güvenli şekilde kapatır.
 * Bu işlem sonunda database.db-wal ve database.db-shm dosyaları silinir.
 */
function close() {
    try {
        // TRUNCATE checkpoint: WAL'daki tüm veriyi main DB'ye yazar ve WAL'ı sıfırlar
        db.pragma('wal_checkpoint(TRUNCATE)');
        db.close();
        console.log('[Veritabanı] WAL checkpoint tamamlandı, bağlantı kapatıldı.');
    } catch (error) {
        console.error('[Veritabanı Hatası] Kapatılırken hata:', error.message);
    }
}

module.exports = {
    db,
    initialize,
    close,
    prepare: (sql) => db.prepare(sql),
    run: (sql, ...params) => db.prepare(sql).run(...params),
    get: (sql, ...params) => db.prepare(sql).get(...params),
    all: (sql, ...params) => db.prepare(sql).all(...params)
};
