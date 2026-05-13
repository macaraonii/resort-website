import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();
const adminToken = 'cw-admin-token';

const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  if (header !== `Bearer ${adminToken}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return next();
};

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASS || 'waves2026';

  if (username === validUser && password === validPass) {
    return res.json({ token: adminToken, username });
  }

  return res.status(401).json({ message: 'Invalid credentials' });
});

router.get('/summary', requireAdmin, async (req, res) => {
  const db = getDb();
  const totals = await db.get(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN stay_type = 'Day Swimming' THEN 1 ELSE 0 END) AS day,
      SUM(CASE WHEN stay_type = 'Night Swimming' THEN 1 ELSE 0 END) AS night,
      SUM(CASE WHEN stay_type = 'Overnight Swimming' THEN 1 ELSE 0 END) AS overnight
    FROM reservations
  `);

  const statusTotals = await db.all(`
    SELECT status, COUNT(*) as count
    FROM reservations
    GROUP BY status
  `);

  res.json({ totals, statusTotals });
});

export default router;
