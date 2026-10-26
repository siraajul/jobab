import { Queue } from 'bullmq';
import { AGENT_QUEUE } from '../src/queue/queue.constants';
import 'dotenv/config';

async function main() {
  const queue = new Queue(AGENT_QUEUE, { connection: { url: process.env.REDIS_URL } });
  try {
    const [command = 'status', id] = process.argv.slice(2);
    if (command === 'status')
      console.log(
        JSON.stringify(await queue.getJobCounts('waiting', 'active', 'failed', 'delayed')),
      );
    else if (command === 'failed')
      console.log(
        JSON.stringify(
          (await queue.getFailed(0, 49)).map((job) => ({ id: job.id, attempts: job.attemptsMade })),
        ),
      );
    else if (command === 'retry' && id) {
      const job = await queue.getJob(id);
      if (!job || (await job.getState()) !== 'failed')
        throw new Error('Specify an existing failed job');
      await job.retry();
      console.log(`Retried job ${job.id}; ambiguous sends still require reconciliation.`);
    } else throw new Error('Usage: queue-admin.ts status | failed | retry JOB_ID');
  } finally {
    await queue.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
