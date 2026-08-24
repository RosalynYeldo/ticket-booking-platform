// @ts-nocheck
const { PrismaClient, Role, SeatStatus } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: {},
    create: { email: 'admin@platform.com', password: passwordHash, role: Role.ADMIN },
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@platform.com' },
    update: {},
    create: { email: 'organiser@platform.com', password: passwordHash, role: Role.ORGANISER },
  });

  const venue = await prisma.venue.create({
    data: {
      name: 'Grand IMAX Arena',
      rows: 5,
      cols: 6,
    },
  });

  const vipCategory = await prisma.seatCategory.create({
    data: { venueId: venue.id, name: 'VIP', price: 50.0 },
  });

  const standardCategory = await prisma.seatCategory.create({
    data: { venueId: venue.id, name: 'Standard', price: 25.0 },
  });

  const seats = [];
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 6; c++) {
      const categoryId = r <= 2 ? vipCategory.id : standardCategory.id;
      const seat = await prisma.seat.create({
        data: {
          venueId: venue.id,
          categoryId,
          row: r,
          col: c,
          seatNumber: `${String.fromCharCode(64 + r)}${c}`,
        },
      });
      seats.push(seat);
    }
  }

  const event = await prisma.event.create({
    data: {
      organiserId: organiser.id,
      venueId: venue.id,
      title: 'Interstellar: 10th Anniversary IMAX Re-Release',
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 86400000 + 10800000),
    },
  });

  for (const seat of seats) {
    await prisma.eventSeat.create({
      data: {
        eventId: event.id,
        seatId: seat.id,
        status: SeatStatus.AVAILABLE,
      },
    });
  }

  console.log(`Seed complete! Event ID: ${event.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });