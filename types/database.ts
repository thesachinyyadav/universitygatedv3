export type UserRole = 'visitor' | 'guard' | 'organiser' | 'cso';
export type VisitorStatus = 'pending' | 'approved' | 'revoked';
export type VisitorCategory = 'student' | 'speaker' | 'vip';
export type EventStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  created_at: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  register_number?: string; // College register number
  photo_url?: string; // Photo of visitor
  event_id?: string;
  event_name?: string;
  date_of_visit?: string; // Legacy field
  date_of_visit_from?: string;
  date_of_visit_to?: string;
  purpose?: string;
  visitor_category?: VisitorCategory;
  qr_color?: string;
  status: VisitorStatus;
  verified_by?: string; // Guard username who verified
  verified_at?: string; // Timestamp when verified
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  event_name: string;
  department?: string;
  description?: string;
  organiser_id?: string;
  date_from: string;
  date_to: string;
  expected_students?: number;
  max_capacity?: number;
  current_registrations: number;
  created_at: string;
  updated_at: string;
}

export interface EventRequest {
  id: string;
  event_name: string;
  department?: string;
  description?: string;
  organiser_id: string;
  date_from: string;
  date_to: string;
  expected_students?: number;
  max_capacity?: number;
  status: EventStatus;
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
