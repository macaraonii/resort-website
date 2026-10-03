import { Router } from 'express';

const router = Router();
const HEALTHCHECK_TIMEOUT_MS = 4000;

router.get('/esp32/health', async (req, res) => {
  const healthcheckUrl = process.env.ESP32_HEALTHCHECK_URL;

  if (!healthcheckUrl) {
    return res.json({
      status: 'unconfigured',
      message: 'ESP32_HEALTHCHECK_URL is not set'
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS);

  try {
    const response = await fetch(healthcheckUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });

    if (!response.ok) {
      return res.json({
        status: 'offline',
        message: `ESP32 responded with ${response.status}`
      });
    }

    return res.json({ status: 'online' });
  } catch (error) {
    return res.json({
      status: 'offline',
      message:
        error?.name === 'AbortError'
          ? 'ESP32 health check timed out'
          : 'ESP32 health check failed'
    });
  } finally {
    clearTimeout(timeoutId);
  }
});

export default router;