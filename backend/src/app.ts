import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { holdSeatService } from './services/seatService';
import { confirmBooking, cancelBooking } from './controllers/bookingController';
import { authenticate, authorize } from './middleware/auth';
import { prisma } from './config/db';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Public Events
app.get('/events/:id/seats', async (req, res) => {
  const seats = await prisma.eventSeat.findMany({
    where: { eventId: req.params.id },
    include: { seat: { include: { category: true } } },
  });
  res.json(seats);
});

// Hold Seat (Customer)
app.post('/seats/hold', authenticate, async (req: any, res) => {
  const { eventId, seatId, ttlSeconds } = req.body;
  try {
    const result = await holdSeatService(eventId, seatId, req.user.id, ttlSeconds);
    res.json(result);
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

// Booking Operations
app.post('/bookings/confirm', authenticate, confirmBooking);
app.post('/bookings/cancel', authenticate, cancelBooking);

// Waitlist Joining
app.post('/waitlist/join', authenticate, async (req: any, res) => {
  const { eventId, categoryId } = req.body;
  const count = await prisma.waitlistEntry.count({ where: { eventId, categoryId, status: 'WAITING' } });

  const entry = await prisma.waitlistEntry.create({
    data: {
      eventId,
      categoryId,
      userId: req.user.id,
      position: count + 1,
    },
  });

  res.status(201).json(entry);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));