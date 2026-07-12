// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If you regenerate via `supabase gen types typescript`, this file can be
// replaced wholesale — the shape is intentionally identical.

export type Role = "coach" | "client";
export type PreferredUnit = "lbs" | "kg";
export type GoalType = "weight" | "habit";
export type GoalStatus = "active" | "achieved" | "archived";
export type ScheduleCategory = "weigh_in" | "photo_checkin" | "habit" | "call" | "other";
export type RecurrenceRule = "daily" | "weekly" | "once";
export type AttachmentType = "image" | "document";
export type BookingStatus = "confirmed" | "cancelled";

export interface Profile {
  id: string;
  role: Role;
  email: string;
  full_name: string | null;
  timezone: string;
  preferred_unit: PreferredUnit;
  consent_accepted_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface WeighIn {
  id: string;
  client_id: string;
  date: string;
  weight_kg: number;
  photo_urls: string[];
  photo_angle_tags: string[];
  notes: string | null;
  fasted: boolean;
  created_at: string;
}

export interface Goal {
  id: string;
  client_id: string;
  type: GoalType;
  target_value: number | null;
  target_date: string | null;
  status: GoalStatus;
  created_by: string;
  created_at: string;
}

export interface ScheduleItem {
  id: string;
  client_id: string;
  title: string;
  category: ScheduleCategory;
  recurrence_rule: RecurrenceRule;
  time_of_day: string;
  created_at: string;
}

export interface ScheduleCompletion {
  id: string;
  schedule_item_id: string;
  date: string;
  completed_at: string;
}

export interface Thread {
  id: string;
  coach_id: string;
  client_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string | null;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  read_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  cal_com_event_id: string;
  client_id: string | null;
  title: string;
  start_time: string;
  end_time: string;
  zoom_link: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface CoachNote {
  id: string;
  client_id: string;
  body: string;
  updated_at: string;
}

export interface Invite {
  id: string;
  email: string;
  token: string;
  coach_id: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// Minimal Supabase Database generic — enough for createClient<Database>() to
// type `.from("table")` calls without pulling in the full generated schema.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      weigh_ins: { Row: WeighIn; Insert: Partial<WeighIn> & { client_id: string; date: string; weight_kg: number }; Update: Partial<WeighIn> };
      goals: { Row: Goal; Insert: Partial<Goal> & { client_id: string; created_by: string }; Update: Partial<Goal> };
      schedule_items: { Row: ScheduleItem; Insert: Partial<ScheduleItem> & { client_id: string; title: string }; Update: Partial<ScheduleItem> };
      schedule_completions: { Row: ScheduleCompletion; Insert: Partial<ScheduleCompletion> & { schedule_item_id: string; date: string }; Update: Partial<ScheduleCompletion> };
      threads: { Row: Thread; Insert: Partial<Thread> & { coach_id: string; client_id: string }; Update: Partial<Thread> };
      messages: { Row: Message; Insert: Partial<Message> & { thread_id: string; sender_id: string }; Update: Partial<Message> };
      bookings: { Row: Booking; Insert: Partial<Booking> & { cal_com_event_id: string; title: string; start_time: string; end_time: string }; Update: Partial<Booking> };
      coach_notes: { Row: CoachNote; Insert: Partial<CoachNote> & { client_id: string }; Update: Partial<CoachNote> };
      invites: { Row: Invite; Insert: Partial<Invite> & { email: string; coach_id: string }; Update: Partial<Invite> };
      push_subscriptions: { Row: PushSubscriptionRow; Insert: Partial<PushSubscriptionRow> & { user_id: string; endpoint: string; p256dh: string; auth: string }; Update: Partial<PushSubscriptionRow> };
    };
  };
}
