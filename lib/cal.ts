// Cal.com API v2 integration — coach-managed calendar sync.
// The coach books/manages calls in Cal.com itself; this just pulls bookings
// into the dashboard's native "My Calendar" view and surfaces the
// auto-generated Zoom link. No client-facing self-booking (v1 scope).
//
// Docs: https://cal.com/docs/api-reference/v2/bookings/get-all-bookings
// Requires CAL_COM_API_KEY in env.

export interface CalBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  attendeeEmail: string | null;
  zoomLink: string | null;
}

const CAL_API_BASE = "https://api.cal.com/v2";

export async function fetchUpcomingBookings(): Promise<CalBooking[]> {
  const apiKey = process.env.CAL_COM_API_KEY;
  if (!apiKey) {
    // Not configured yet — surface an empty list rather than throwing, so
    // the dashboard still renders before Cal.com is wired up.
    return [];
  }

  const res = await fetch(`${CAL_API_BASE}/bookings?status=upcoming`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "cal-api-version": "2024-08-13",
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    console.error("Cal.com bookings fetch failed", res.status, await res.text());
    return [];
  }

  const json = await res.json();
  const bookings = json?.data ?? [];

  return bookings.map((b: any) => ({
    id: String(b.id ?? b.uid),
    title: b.title ?? "Coaching call",
    startTime: b.start ?? b.startTime,
    endTime: b.end ?? b.endTime,
    status: b.status ?? "confirmed",
    attendeeEmail: b.attendees?.[0]?.email ?? null,
    zoomLink:
      b.location?.startsWith?.("http") ? b.location : b.meetingUrl ?? b.videoCallUrl ?? null,
  }));
}

// Matches a Cal.com booking's attendee email against a client profile so the
// dashboard can show a name instead of a raw booking payload.
export function matchClientByEmail<T extends { email: string }>(
  clients: T[],
  email: string | null
): T | undefined {
  if (!email) return undefined;
  return clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
}
