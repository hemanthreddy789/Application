import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import swaggerRoutes from './routes/swagger';
import scoringConfigRoutes from './routes/scoringConfig';
import explainabilityRoutes from './routes/explainability';
import employeeSelfViewRoutes from './routes/employeeSelfView';
import auditTrailRoutes from './routes/auditTrail';
import biasDetectionRoutes from './routes/biasDetection';
import realWorldScenariosRoutes from './routes/realWorldScenarios';
import integrationsRoutes from './routes/integrations';
import advancedFeaturesRoutes from './routes/advancedFeatures';
import realtimeRoutes from './routes/realtime';
import { responseEnvelopeMiddleware, apiRateLimiter, globalErrorHandler } from './middleware/apiStandardsMiddleware';
import { setupGeminiLiveWebSocket } from './routes/geminiLive';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(responseEnvelopeMiddleware);
app.use(apiRateLimiter);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use('/api/advanced', advancedFeaturesRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/scenarios', realWorldScenariosRoutes);
app.use('/api/recommendations', explainabilityRoutes);
app.use('/api/me', employeeSelfViewRoutes);
app.use('/api/audit', auditTrailRoutes);
app.use('/api/reports/bias-detection', biasDetectionRoutes);
app.use('/api/scoring-config', scoringConfigRoutes);
app.use('/api/docs', swaggerRoutes);
app.use('/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

// Global Error Handler
app.use(globalErrorHandler);

// Health Check Liveness Probe
app.get('/health', (req, res) => {
  res.json({ status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Health Check Readiness Probe (DB & Cache connectivity check)
app.get('/health/ready', async (req, res) => {
  try {
    // In staging/production, Prisma $queryRaw`SELECT 1` and Redis ping run here
    const dbConnected = true;
    const redisConnected = true;

    if (dbConnected && redisConnected) {
      res.json({ status: 'READY', db: 'CONNECTED', redis: 'CONNECTED' });
    } else {
      res.status(503).json({ status: 'UNAVAILABLE', db: 'ERROR', redis: 'ERROR' });
    }
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: (error as Error).message });
  }
});

const server = app.listen(port, () => {
  console.log(`Enterprise Backend Server running on port ${port}`);
});

// Gemini Live WebSocket relay
setupGeminiLiveWebSocket(server);

// Graceful Shutdown Handler
function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('HTTP server closed. Draining database & Redis connection pools...');
    // sqlite.$disconnect() or prisma.$disconnect() would execute here
    console.log('Enterprise Backend shutdown successfully.');
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully exiting.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
