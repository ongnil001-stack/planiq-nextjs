export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role_title: string | null;
          designation: string | null;
          country_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          designation?: string | null;
          country_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          designation?: string | null;
          country_code?: string | null;
          updated_at?: string;
        };
      };
      schedules: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          type: 'task' | 'event' | 'reminder' | 'block';
          priority: 'high' | 'medium' | 'low' | 'critical';
          start_time: string;
          end_time: string | null;
          all_day: boolean;
          color: string | null;
          location: string | null;
          recurrence_rule: string | null;
          recurrence_end: string | null;
          timezone: string | null;
          reminder_minutes: number | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          type?: 'task' | 'event' | 'reminder' | 'block';
          priority?: 'high' | 'medium' | 'low' | 'critical';
          start_time: string;
          end_time?: string | null;
          all_day?: boolean;
          color?: string | null;
          location?: string | null;
          recurrence_rule?: string | null;
          recurrence_end?: string | null;
          timezone?: string | null;
          reminder_minutes?: number | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          type?: 'task' | 'event' | 'reminder' | 'block';
          priority?: 'high' | 'medium' | 'low' | 'critical';
          start_time?: string;
          end_time?: string | null;
          all_day?: boolean;
          color?: string | null;
          location?: string | null;
          recurrence_rule?: string | null;
          recurrence_end?: string | null;
          timezone?: string | null;
          is_completed?: boolean;
          updated_at?: string;
        };
      };
      ai_analyses: {
        Row: {
          id: string;
          user_id: string;
          analysis_date: string;
          workload_score: number | null;
          summary: string | null;
          recommendations: Json | null;
          issues: Json | null;
          raw_response: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          analysis_date?: string;
          workload_score?: number | null;
          summary?: string | null;
          recommendations?: Json | null;
          issues?: Json | null;
          raw_response?: string | null;
          created_at?: string;
        };
        Update: never;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      schedule_type: 'task' | 'event' | 'reminder' | 'block';
      priority_level: 'high' | 'medium' | 'low' | 'critical';
    };
  };
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type Schedule = Database['public']['Tables']['schedules']['Row'];
export type AiAnalysis = Database['public']['Tables']['ai_analyses']['Row'];
export type NewSchedule = Database['public']['Tables']['schedules']['Insert'];
export type ScheduleType = 'task' | 'event' | 'reminder' | 'block';
export type Priority = 'high' | 'medium' | 'low' | 'critical';
export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
