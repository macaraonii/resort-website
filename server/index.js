import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './src/db.js';
import reservationsRouter from './src/routes/reservations.js';
import accommodationsRouter from './src/routes/accommodations.js';
import adminRouter from './src/routes/admin.js';
import devicesRouter from './src/routes/devices.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Caribbean Waves API running' });
});

app.use('/api/reservations', reservationsRouter);
app.use('/api/accommodations', accommodationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/devices', devicesRouter);

const port = process.env.PORT || 4000;

const startServer = async () => {
  await initDb();
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
