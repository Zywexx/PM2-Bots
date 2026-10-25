const { db } = require('../database/db');
const logger = require('../utils/logger');
const timeUtils = require('../utils/time');

function create({ userId, registeredBy, name, age, gender }) {
    try {
        const stmt = db.prepare(`
            INSERT INTO registrations (user_id, registered_by, name, age, gender, created_at, cancelled, synced_to_findcord)
            VALUES (?, ?, ?, ?, ?, datetime('now'), 0, 0)
        `);
        const info = stmt.run(userId, registeredBy, name, age, gender);
        const registrationId = info.lastInsertRowid;
        
        const weekKey = timeUtils.getWeeklyKey();
        const monthKey = timeUtils.getMonthlyKey();

        const statStmt = db.prepare(`
            INSERT INTO registration_stats (staff_id, period_type, period_key, count)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(staff_id, period_type, period_key) DO UPDATE SET count = count + 1
        `);

        statStmt.run(registeredBy, 'weekly', weekKey);
        statStmt.run(registeredBy, 'monthly', monthKey);
        statStmt.run(registeredBy, 'all_time', 'all_time');

        return {
            id: registrationId,
            userId,
            registeredBy,
            name,
            age,
            gender
        };
    } catch (error) {
        logger.error(`Error in registrationService.create: ${error.message}`, 'KAYIT', error);
        return null;
    }
}

function cancel(registrationId) {
    try {
        db.prepare(`UPDATE registrations SET cancelled = 1 WHERE id = ?`).run(registrationId);
        return true;
    } catch (error) {
        logger.error(`Error in registrationService.cancel: ${error.message}`);
        return false;
    }
}

function update(registrationId, changedBy, changes) {
    try {
        const oldReg = getById(registrationId);
        if (!oldReg) return false;

        db.transaction(() => {
            const historyStmt = db.prepare(`INSERT INTO registration_history (registration_id, changed_by, field, old_value, new_value, changed_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`);
            const updateStmt = db.prepare(`UPDATE registrations SET name = ?, age = ?, gender = ? WHERE id = ?`);

            const newName = changes.name !== undefined ? changes.name : oldReg.name;
            const newAge = changes.age !== undefined ? changes.age : oldReg.age;
            const newGender = changes.gender !== undefined ? changes.gender : oldReg.gender;

            if (changes.name !== undefined && changes.name !== oldReg.name) historyStmt.run(registrationId, changedBy, 'name', oldReg.name, changes.name);
            if (changes.age !== undefined && changes.age !== oldReg.age) historyStmt.run(registrationId, changedBy, 'age', oldReg.age.toString(), changes.age.toString());
            if (changes.gender !== undefined && changes.gender !== oldReg.gender) historyStmt.run(registrationId, changedBy, 'gender', oldReg.gender, changes.gender);

            updateStmt.run(newName, newAge, newGender, registrationId);
        })();
        return true;
    } catch (error) {
        logger.error(`Error in registrationService.update: ${error.message}`);
        return false;
    }
}

function getByUserId(userId) {
    try {
        return db.prepare(`SELECT * FROM registrations WHERE user_id = ? AND cancelled = 0 ORDER BY created_at DESC LIMIT 1`).get(userId);
    } catch (error) {
        logger.error(`Error in registrationService.getByUserId: ${error.message}`);
        return null;
    }
}

function getById(registrationId) {
    try {
        return db.prepare(`SELECT * FROM registrations WHERE id = ?`).get(registrationId);
    } catch (error) {
        logger.error(`Error in registrationService.getById: ${error.message}`);
        return null;
    }
}

function getHistory(registrationId) {
    try {
        return db.prepare(`SELECT * FROM registration_history WHERE registration_id = ?`).all(registrationId);
    } catch (error) {
        logger.error(`Error in registrationService.getHistory: ${error.message}`);
        return [];
    }
}

function getLeaderboard(periodType, periodKey, limit = 10) {
    try {
        return db.prepare(`SELECT staff_id, count FROM registration_stats WHERE period_type = ? AND period_key = ? ORDER BY count DESC LIMIT ?`).all(periodType, periodKey, limit);
    } catch (error) {
        logger.error(`Error in registrationService.getLeaderboard: ${error.message}`);
        return [];
    }
}

function getStaffStats(staffId, periodType, periodKey) {
    try {
        return db.prepare(`SELECT * FROM registration_stats WHERE staff_id = ? AND period_type = ? AND period_key = ?`).get(staffId, periodType, periodKey);
    } catch (error) {
        logger.error(`Error in registrationService.getStaffStats: ${error.message}`);
        return null;
    }
}

function getStaffRank(staffId, periodType, periodKey) {
    try {
        const staffStat = getStaffStats(staffId, periodType, periodKey);
        if (!staffStat) return null;
        const count = db.prepare(`SELECT COUNT(*) as rank FROM registration_stats WHERE period_type = ? AND period_key = ? AND count > ?`).get(periodType, periodKey, staffStat.count).rank;
        return count + 1;
    } catch (error) {
        logger.error(`Error in registrationService.getStaffRank: ${error.message}`);
        return null;
    }
}

function getPreviousRegistration(userId) {
    try {
        return db.prepare(`SELECT * FROM registrations WHERE user_id = ? AND cancelled = 0 ORDER BY created_at DESC LIMIT 1`).get(userId);
    } catch (error) {
        logger.error(`Error in registrationService.getPreviousRegistration: ${error.message}`);
        return null;
    }
}

module.exports = {
    create,
    cancel,
    update,
    getByUserId,
    getById,
    getHistory,
    getLeaderboard,
    getStaffStats,
    getStaffRank,
    getPreviousRegistration
};
