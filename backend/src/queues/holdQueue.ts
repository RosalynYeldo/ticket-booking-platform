import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/db';

export const holdExpiryQueue = new Queue('seat-hold-expiry', { connection: redis });

export const holdExpiryWorker = new Worker(
  'seat-hold-expiry',
  async (job) => {
    const { holdId, eventSeatId } = job.data;

    await prisma.$transaction(async (tx) => {
      const hold = await tx.seatHold.findUnique({ where: { id: holdId } });
      if (!hold || hold.status !== 'ACTIVE') return;

      await tx.seatHold.update({
        where: { id: holdId },
        data: { status: 'EXPIRED' },
      });

      await tx.eventSeat.update({
        where: { id: eventSeatId },
        data: { status: 'AVAILABLE' },
      });
    });
  },
  { connection: redis }
);