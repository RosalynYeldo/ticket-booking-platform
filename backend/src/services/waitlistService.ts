import { prisma } from '../config/db';
import crypto from 'crypto';
import { sendWaitlistOfferEmail } from './emailService';
import { waitlistExpiryQueue } from '../queues/waitlistQueue';

export const processWaitlistNextInLine = async (eventId: string, categoryId: string, eventSeatId: string) => {
  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: { eventId, categoryId, status: 'WAITING' },
    orderBy: { position: 'asc' },
    include: { user: true, event: true },
  });

  if (!nextEntry) {
    // No one on waitlist, release seat back to public
    await prisma.eventSeat.update({
      where: { id: eventSeatId },
      data: { status: 'AVAILABLE' },
    });
    return;
  }

  const offerToken = crypto.randomBytes(24).toString('hex');
  const offerExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await prisma.$transaction([
    prisma.waitlistEntry.update({
      where: { id: nextEntry.id },
      data: {
        status: 'OFFERED',
        offerToken,
        offerExpiresAt,
      },
    }),
    prisma.eventSeat.update({
      where: { id: eventSeatId },
      data: { status: 'HELD_FOR_WAITLIST' },
    }),
  ]);

  // Schedule expiration worker
  await waitlistExpiryQueue.add(
    'expire-offer',
    { waitlistEntryId: nextEntry.id, eventSeatId, eventId, categoryId },
    { delay: 15 * 60 * 1000 }
  );

  const claimLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/claim?token=${offerToken}`;
  await sendWaitlistOfferEmail(nextEntry.user.email, claimLink, nextEntry.event.title);
};