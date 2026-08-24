import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/db';
import { processWaitlistNextInLine } from '../services/waitlistService';

export const waitlistExpiryQueue = new Queue('waitlist-expiry', { connection: redis });

export const waitlistExpiryWorker = new Worker(
  'waitlist-expiry',
  async (job) => {
    const { waitlistEntryId, eventSeatId, eventId, categoryId } = job.data;

    const entry = await prisma.waitlistEntry.findUnique({ where: { id: waitlistEntryId } });
    if (!entry || entry.status !== 'OFFERED') return;

    await prisma.waitlistEntry.update({
      where: { id: waitlistEntryId },
      data: { status: 'EXPIRED' },
    });

    // Recursively trigger next candidate in line
    await processWaitlistNextInLine(eventId, categoryId, eventSeatId);
  },
  { connection: redis }
);