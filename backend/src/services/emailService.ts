import QRCode from 'qrcode';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');

export const sendTicketEmail = async (userEmail: string, bookingRef: string, eventTitle: string) => {
  const qrDataUrl = await QRCode.toDataURL(JSON.stringify({ bookingRef, eventTitle }));

  if (process.env.NODE_ENV === 'test' || !process.env.RESEND_API_KEY) {
    console.log(`[MOCK EMAIL] To: ${userEmail} | BookingRef: ${bookingRef}`);
    return;
  }

  await resend.emails.send({
    from: 'tickets@platform.com',
    to: userEmail,
    subject: `Your Ticket for ${eventTitle}`,
    html: `
      <h2>Booking Confirmed!</h2>
      <p>Event: <strong>${eventTitle}</strong></p>
      <p>Booking Reference: <strong>${bookingRef}</strong></p>
      <p>Show this QR code at the entrance:</p>
      <img src="${qrDataUrl}" alt="Ticket QR Code" />
    `,
  });
};

export const sendWaitlistOfferEmail = async (userEmail: string, offerLink: string, eventTitle: string) => {
  if (process.env.NODE_ENV === 'test' || !process.env.RESEND_API_KEY) {
    console.log(`[MOCK EMAIL] Offer to: ${userEmail} | Link: ${offerLink}`);
    return;
  }

  await resend.emails.send({
    from: 'tickets@platform.com',
    to: userEmail,
    subject: `A Seat is Available for ${eventTitle}!`,
    html: `
      <h2>Great news!</h2>
      <p>A seat has opened up for <strong>${eventTitle}</strong>.</p>
      <p>You have 15 minutes to complete your claim:</p>
      <a href="${offerLink}">Claim Your Ticket Now</a>
    `,
  });
};