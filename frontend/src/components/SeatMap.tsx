'use client';

import React, { useState, useEffect, useCallback } from 'react';

// --- Types ---
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'SELECTED';

export interface SeatData {
  id: string; // EventSeat ID or Seat ID
  row: number;
  col: number;
  seatNumber: string;
  categoryName: string;
  price: number;
  status: SeatStatus;
}

interface SeatMapProps {
  eventId: string;
  apiUrl?: string;
  holdDurationSeconds?: number; // e.g., 600 for 10 mins
  maxSeatsSelectable?: number;
}

export default function SeatMap({
  eventId,
  apiUrl = 'http://localhost:4000',
  holdDurationSeconds = 600,
  maxSeatsSelectable = 6,
}: SeatMapProps) {
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdTimer, setHoldTimer] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch event seats grid
  const fetchSeatMap = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${apiUrl}/events/${eventId}/seats`);
      if (!res.ok) throw new Error('Failed to load seat map data');
      const data: SeatData[] = await res.json();
      setSeats(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading seating layout');
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, eventId]);

  useEffect(() => {
    fetchSeatMap();
  }, [fetchSeatMap]);

  // 2. Countdown Timer logic for Active Seat Holds
  useEffect(() => {
    if (!isHolding || holdTimer <= 0) return;

    const interval = setInterval(() => {
      setHoldTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsHolding(false);
          setSelectedSeatIds([]);
          fetchSeatMap(); // Refresh status on hold expiration
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isHolding, holdTimer, fetchSeatMap]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 3. Toggle Seat Selection
  const handleSeatClick = (seat: SeatData) => {
    if (seat.status !== 'AVAILABLE' || isHolding) return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= maxSeatsSelectable) {
        alert(`You can select a maximum of ${maxSeatsSelectable} seats.`);
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  // 4. Trigger Hold (Reserve) Endpoint
  const handleReserveSeats = async () => {
    if (selectedSeatIds.length === 0) return;

    try {
      setErrorMessage(null);
      const res = await fetch(`${apiUrl}/events/${eventId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatIds: selectedSeatIds }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to hold selected seats');
      }

      setIsHolding(true);
      setHoldTimer(holdDurationSeconds);
      fetchSeatMap(); // Update map rendering to HELD status
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Group seats by rows for matrix rendering
  const maxRows = Math.max(...seats.map((s) => s.row), 0);
  const maxCols = Math.max(...seats.map((s) => s.col), 0);

  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeats.reduce((acc, s) => acc + s.price, 0);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 font-medium">Loading Interactive Seating Grid...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-900 text-white rounded-xl shadow-2xl">
      {/* Header & Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Select Seats</h2>
          <p className="text-sm text-slate-400">Click on available seats to reserve</p>
        </div>

        {/* Dynamic Countdown Timer Banner */}
        {isHolding && (
          <div className="flex items-center space-x-3 bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-300 font-medium">Hold Expires in:</span>
            <span className="font-mono text-lg font-bold text-amber-400">{formatTime(holdTimer)}</span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Curved Screen Indicator */}
      <div className="my-8 flex flex-col items-center">
        <div className="w-3/4 h-2 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full shadow-[0_4px_20px_rgba(99,102,241,0.5)]" />
        <span className="text-xs text-slate-500 uppercase tracking-widest mt-2 font-semibold">STAGE / SCREEN</span>
      </div>

      {/* Seating Grid */}
      <div className="overflow-x-auto pb-6">
        <div
          className="grid gap-2 justify-center mx-auto"
          style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(36px, 1fr))` }}
        >
          {Array.from({ length: maxRows }).map((_, rIdx) =>
            Array.from({ length: maxCols }).map((_, cIdx) => {
              const row = rIdx + 1;
              const col = cIdx + 1;
              const seat = seats.find((s) => s.row === row && s.col === col);

              if (!seat) {
                return <div key={`empty-${row}-${col}`} className="w-9 h-9" />;
              }

              const isSelected = selectedSeatIds.includes(seat.id);
              const isAvailable = seat.status === 'AVAILABLE';
              const isHeld = seat.status === 'HELD';
              const isBooked = seat.status === 'BOOKED';

              // Dynamic Color States
              let seatStyle = 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'; // AVAILABLE
              if (isSelected) seatStyle = 'bg-indigo-600 ring-2 ring-indigo-400 text-white scale-105';
              if (isHeld) seatStyle = 'bg-amber-600/60 text-amber-200 cursor-not-allowed opacity-75';
              if (isBooked) seatStyle = 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-40';

              return (
                <button
                  key={seat.id}
                  disabled={!isAvailable || isHolding}
                  onClick={() => handleSeatClick(seat)}
                  className={`w-9 h-9 rounded-t-lg text-xs font-semibold flex items-center justify-center transition-all duration-150 shadow-sm ${seatStyle}`}
                  title={`${seat.seatNumber} (${seat.categoryName}) - $${seat.price}`}
                >
                  {seat.seatNumber}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex flex-wrap justify-center items-center gap-6 py-4 border-t border-b border-slate-800 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-t bg-emerald-600 inline-block" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-t bg-indigo-600 inline-block" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-t bg-amber-600/60 inline-block" />
          <span>Held (Temporary)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-t bg-slate-700 inline-block" />
          <span>Sold Out</span>
        </div>
      </div>

      {/* Checkout Footer Summary */}
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-sm text-slate-400">Selected Seats ({selectedSeatIds.length}):</span>
          <div className="font-medium text-white text-base">
            {selectedSeats.length > 0 ? selectedSeats.map((s) => s.seatNumber).join(', ') : 'None'}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-sm text-slate-400">Total Price</span>
            <div className="text-2xl font-bold text-emerald-400">${totalPrice.toFixed(2)}</div>
          </div>

          <button
            onClick={handleReserveSeats}
            disabled={selectedSeatIds.length === 0 || isHolding}
            className={`px-6 py-3 rounded-lg font-bold text-sm transition-all duration-150 ${
              selectedSeatIds.length > 0 && !isHolding
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            {isHolding ? 'Seats Locked' : 'Hold Seats'}
          </button>
        </div>
      </div>
    </div>
  );
}