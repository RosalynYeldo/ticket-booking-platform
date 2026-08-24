# ticket-booking-platform

# High-Demand Ticket Booking Platform

A full-stack, real-time ticket booking platform for high-concurrency event sales. Supports visual seat selection, 10-minute temporary seat holds with automatic expiration, waitlist queue management, and QR code ticket generation sent via email.

---

## Architecture & Technology Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **In-Memory Store:** Redis (Distributed Locks, Key Expiration Pub/Sub, Waitlist Queues)
- **Email & Ticketing:** Nodemailer, `qrcode` library

---

## Setup & Local Installation Guide

### Prerequisites
- Docker & Docker Compose
- Node.js v20+

### 1. Clone & Configure Environment Variables

git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
cd YOUR_REPO_NAME
cp .env.example .env

###2. RUn with docker
docker compose up -d --build

###3. Apply Migrations & Seed Database

docker compose exec backend npx prisma migrate dev
docker compose exec backend npx prisma db seed
Access the frontend at http://localhost:3000 and the backend at http://localhost:4000.
