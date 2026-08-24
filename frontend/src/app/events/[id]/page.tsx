import SeatMap from '../../../components/SeatMap';

export default async function EventBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4">
      <SeatMap eventId={id} />
    </main>
  );
}