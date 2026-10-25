const { db } = require('../database/db');
const logger = require('../utils/logger');
const config = require('../../config.json');

function checkEscalation(userId, type) {
    try {
        const limit = config.penals?.[type]?.limit;
        if (!limit || limit <= 0) return { escalate: false };

        const count = db.prepare(`
            SELECT COUNT(*) as count FROM penalties 
            WHERE user_id = ? AND type = ? AND created_at >= datetime('now', '-30 days')
        `).get(userId, type).count;

        if (count >= limit) {
            const escalationMap = { 'warn': 'mute', 'mute': 'jail', 'jail': 'ban' };
            const nextAction = escalationMap[type];
            return { escalate: true, triggered: true, count, limit, nextAction };
        }
        return { escalate: false, triggered: false };
    } catch (error) {
        logger.error(`Error in penalService.checkEscalation: ${error.message}`);
        return { escalate: false };
    }
}

function create({ userId, type, reason, staffId, points, duration, expiresAt }) {
    try {
        const stmt = db.prepare(`
            INSERT INTO penalties (user_id, type, reason, staff_id, points, duration, expires_at, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
        `);
        const info = stmt.run(userId, type, reason, staffId, points, duration, expiresAt);
        
        const penaltyId = info.lastInsertRowid;
        const escalation = checkEscalation(userId, type);

        return {
            id: penaltyId,
            userId,
            type,
            reason,
            staffId,
            points,
            duration,
            expiresAt,
            escalation
        };
    } catch (error) {
        logger.error(`Error in penalService.create: ${error.message}`, 'CEZA', error);
        return null;
    }
}

function revoke(penaltyId, revokedBy, reason) {
    try {
        db.prepare(`
            UPDATE penalties SET status = 'revoked', revoked_by = ?, revoked_at = datetime('now'), revoke_reason = ? 
            WHERE id = ?
        `).run(revokedBy, reason, penaltyId);
        return true;
    } catch (error) {
        logger.error(`Error in penalService.revoke: ${error.message}`);
        return false;
    }
}

function revokeAll(userId, revokedBy, reason) {
    try {
        const stmt = db.prepare(`
            UPDATE penalties SET status = 'revoked', revoked_by = ?, revoked_at = datetime('now'), revoke_reason = ? 
            WHERE user_id = ? AND status = 'active'
        `);
        const info = stmt.run(revokedBy, reason, userId);
        return info.changes;
    } catch (error) {
        logger.error(`Error in penalService.revokeAll: ${error.message}`);
        return 0;
    }
}

function deletePenalty(penaltyId) {
    try {
        const info = db.prepare(`DELETE FROM penalties WHERE id = ?`).run(penaltyId);
        return info.changes > 0;
    } catch (error) {
        logger.error(`Error in penalService.deletePenalty: ${error.message}`);
        return false;
    }
}

function getByUserId(userId) {
    try {
        return db.prepare(`SELECT * FROM penalties WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC`).all(userId);
    } catch (error) {
        logger.error(`Error in penalService.getByUserId: ${error.message}`);
        return [];
    }
}

function getAllByUserId(userId) {
    try {
        return db.prepare(`
            SELECT * FROM penalties WHERE user_id = ? 
            ORDER BY 
            CASE type WHEN 'ban' THEN 1 WHEN 'jail' THEN 2 WHEN 'kick' THEN 3 WHEN 'mute' THEN 4 WHEN 'warn' THEN 5 ELSE 6 END, 
            created_at DESC
        `).all(userId);
    } catch (error) {
        logger.error(`Error in penalService.getAllByUserId: ${error.message}`);
        return [];
    }
}

function getByType(userId, type) {
    try {
        return db.prepare(`SELECT * FROM penalties WHERE user_id = ? AND type = ?`).all(userId, type);
    } catch (error) {
        logger.error(`Error in penalService.getByType: ${error.message}`);
        return [];
    }
}

function getSummary(userId) {
    try {
        const penalties = getAllByUserId(userId);
        
        const active = { ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0, count: 0, points: 0 };
        const old = { ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0, count: 0, points: 0 };

        for (const p of penalties) {
            const isRevoked = p.status === 'revoked';
            const type = (p.type || '').toLowerCase();
            const points = p.points || 0;

            if (isRevoked) {
                if (old[type] !== undefined) old[type]++;
                old.count++;
                old.points += points;
            } else {
                if (active[type] !== undefined) active[type]++;
                active.count++;
                active.points += points;
            }
        }

        return {
            active,
            old,
            ban: active.ban,
            jail: active.jail,
            kick: active.kick,
            mute: active.mute,
            warn: active.warn,
            timeout: active.timeout,
            // Ceza Puanı: Sadece aktif cezaların puanı (silinen/kaldırılan cezalar düşer!)
            totalPoints: active.points,
            activePoints: active.points,
            oldPoints: old.points,
            allTimePoints: active.points + old.points,
            activeCount: active.count,
            oldCount: old.count,
            totalCount: penalties.length
        };
    } catch (error) {
        logger.error(`Error in penalService.getSummary: ${error.message}`);
        return {
            active: { ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0, count: 0, points: 0 },
            old: { ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0, count: 0, points: 0 },
            ban: 0, jail: 0, kick: 0, mute: 0, warn: 0, timeout: 0,
            totalPoints: 0, activePoints: 0, oldPoints: 0, allTimePoints: 0,
            activeCount: 0, oldCount: 0, totalCount: 0
        };
    }
}

function getDetail(penaltyId) {
    try {
        return db.prepare(`SELECT * FROM penalties WHERE id = ?`).get(penaltyId);
    } catch (error) {
        logger.error(`Error in penalService.getDetail: ${error.message}`);
        return null;
    }
}

function getStaffDistribution(userId) {
    try {
        return db.prepare(`
            SELECT staff_id as staffId, COUNT(*) as count 
            FROM penalties 
            WHERE user_id = ? 
            GROUP BY staff_id
        `).all(userId);
    } catch (error) {
        logger.error(`Error in penalService.getStaffDistribution: ${error.message}`);
        return [];
    }
}

function getExpiredPenalties() {
    try {
        return db.prepare(`SELECT * FROM penalties WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= datetime('now')`).all();
    } catch (error) {
        logger.error(`Error in penalService.getExpiredPenalties: ${error.message}`);
        return [];
    }
}

function getActiveTimed() {
    try {
        return db.prepare(`SELECT * FROM penalties WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at > datetime('now')`).all();
    } catch (error) {
        logger.error(`Error in penalService.getActiveTimed: ${error.message}`);
        return [];
    }
}

module.exports = {
    create,
    revoke,
    revokeAll,
    deletePenalty,
    getByUserId,
    getAllByUserId,
    getByType,
    getSummary,
    getDetail,
    getById: getDetail,
    getStaffDistribution,
    checkEscalation,
    getExpiredPenalties,
    getActiveTimed
};
