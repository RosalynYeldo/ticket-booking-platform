import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { sendTicketEmail } from '../services/emailService';
import { processWaitlistNextInLine } from '../services/waitlistService';

export const confirmBooking = async (req: AuthRequest, res: Response) => {
  const { holdId } = req.body;
  const userId = req.user!.id;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const hold = await tx.seatHold.findUnique({
        where: { id: holdId },
        include: { eventSeat: { include: { event: true } } },
      });

      if (!hold || hold.userId !== userId || hold.status !== 'ACTIVE' || hold.expiresAt < new Date()) {
        throw new Error('Hold is invalid or expired');
      }

      await tx.seatHold.update({
        where: { id: holdId },
        data: { status: 'CONVERTED' },
      });

      await tx.eventSeat.update({
        where: { id: hold.eventSeatId },
        data: { status: 'BOOKED' },
      });

      return await tx.booking.create({
        data: {
          userId,
          eventId: hold.eventSeat.eventId,
          eventSeatId: hold.eventSeatId,
          status: 'CONFIRMED',
        },
        include: { event: true, user: true },
      });
    });

    await sendTicketEmail(booking.user.email, booking.bookingRef, booking.event.title);

    return res.status(201).json({ message: 'Booking confirmed', booking });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  const { bookingId } = req.body;
  const userId = req.user!.id;

  try {
    const { eventSeat, eventId, categoryId } = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { eventSeat: { include: { seat: true } } },
      });

      if (!booking || booking.userId !== userId || booking.status !== 'CONFIRMED') {
        throw new Error('Invalid booking cancellation request');
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      return {
        eventSeat: booking.eventSeat,
        eventId: booking.eventId,
        categoryId: booking.eventSeat.seat.categoryId,
      };
    });

    // Delegate cancellation slot to waitlist queue worker
    await processWaitlistNextInLine(eventId, categoryId, eventSeat.id);

    return res.status(200).json({ message: 'Booking cancelled successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
};