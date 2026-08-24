import { prisma } from '../config/db';
import { acquireLock, releaseLock } from '../config/redis';
import { holdExpiryQueue } from '../queues/holdQueue';

export const holdSeatService = async (eventId: string, seatId: string, userId: string, ttlSeconds: number = 600) => {
  const lockKey = `event:${eventId}:seat:${seatId}`;
  const lockToken = await acquireLock(lockKey, 5000);

  if (!lockToken) {
    throw new Error('Seat is currently locked by another transaction. Try again.');
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const eventSeat = await tx.eventSeat.findUnique({
        where: { eventId_seatId: { eventId, seatId } },
      });

      if (!eventSeat || eventSeat.status !== 'AVAILABLE') {
        throw new Error('Seat is not available for hold');
      }

      // Optimistic concurrency update
      const updatedSeat = await tx.eventSeat.update({
        where: { id: eventSeat.id, version: eventSeat.version },
        data: {
          status: 'HELD',
          version: { increment: 1 },
        },
      });

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const hold = await tx.seatHold.create({
        data: {
          eventSeatId: updatedSeat.id,
          userId,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      // Schedule auto-release
      await holdExpiryQueue.add(
        'expire-hold',
        { holdId: hold.id, eventSeatId: updatedSeat.id },
        { delay: ttlSeconds * 1000 }
      );

      return { hold, updatedSeat };
    });
  } finally {
    await releaseLock(lockKey, lockToken);
  }
};