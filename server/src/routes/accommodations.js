import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

router.get('/rooms', async (req, res) => {
  const db = getDb();
  const rooms = await db.all('SELECT * FROM rooms ORDER BY price ASC');
  res.json({ data: rooms });
});

router.get('/cottages', async (req, res) => {
  const db = getDb();
  const cottages = await db.all('SELECT * FROM cottages ORDER BY price ASC');
  res.json({ data: cottages });
});

export default router;
