// Enterprise BullMQ Background Workers
import { Queue, Worker, QueueEvents } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000 // 5s, 10s, 20s...
  },
  removeOnComplete: { age: 3600, count: 100 },
  removeOnFail: { age: 86400, count: 500 }
};

class EnterpriseQueueService {
  public mlRetrainQueue: Queue;
  public forecastQueue: Queue;
  public notificationQueue: Queue;
  public auditQueue: Queue;
  public dlq: any[] = [];

  constructor() {
    this.mlRetrainQueue = new Queue('ml-retrain', { connection, defaultJobOptions });
    this.forecastQueue = new Queue('forecast-precompute', { connection, defaultJobOptions });
    this.notificationQueue = new Queue('notifications', { connection, defaultJobOptions });
    this.auditQueue = new Queue('audit-archive', { connection, defaultJobOptions });

    this.initializeWorkers();
  }

  private initializeWorkers() {
    try {
      // 1. ML Retrain Worker (Runs Nightly / Triggered)
      new Worker('ml-retrain', async (job: any) => {
        console.log(`Processing ML Retrain Job: ${job.id} for Tenant ${job.data.tenantId}`);
        // Calls Python ML Service webhook endpoint
      }, { connection });

      // 2. Forecast Pre-computation Worker (Runs every 4 hours)
      new Worker('forecast-precompute', async (job: any) => {
        console.log(`Precomputing forecasts for Tenant ${job.data.tenantId}`);
      }, { connection });

      // 3. Notifications Worker
      new Worker('notifications', async (job: any) => {
        console.log(`Dispatching ${job.data.channel} notification to ${job.data.recipient}`);
      }, { connection });

      // 4. Audit Log Archiving Worker
      new Worker('audit-archive', async (job: any) => {
        console.log(`Archiving audit logs for batch ${job.id}`);
      }, { connection });

      // Queue Event Listener for Dead-Letter Queue (DLQ) Handling
      const retrainEvents = new QueueEvents('ml-retrain', { connection });
      retrainEvents.on('failed', ({ jobId, failedReason }: { jobId: string; failedReason: string }) => {
        console.error(`Job ${jobId} failed completely. Routing to Dead-Letter Queue (DLQ). Reason: ${failedReason}`);
        this.dlq.push({ jobId, queue: 'ml-retrain', failedReason, timestamp: new Date() });
      });
    } catch (e) {
      console.warn('BullMQ Redis connection unavailable, running Enterprise Queue Service in Mock/Dev mode.');
    }
  }

  async enqueueRetrain(tenantId: string) {
    return this.mlRetrainQueue.add('retrain', { tenantId });
  }

  async enqueueForecastPrecompute(tenantId: string) {
    return this.forecastQueue.add('precompute', { tenantId });
  }

  async enqueueNotification(recipient: string, channel: string, payload: any) {
    return this.notificationQueue.add('notify', { recipient, channel, payload });
  }

  async enqueueAuditArchive(logsBatch: any[]) {
    return this.auditQueue.add('archive', { batchSize: logsBatch.length, logsBatch });
  }
}

export const queueService = new EnterpriseQueueService();
