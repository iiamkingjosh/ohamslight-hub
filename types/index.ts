export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export type TimestampValue =
  | Date
  | string
  | number
  | null
  | {
      toDate?: () => Date;
      _seconds?: number;
    };

export interface AdminInvitation {
  status: 'pending' | 'accepted' | 'rejected';
  invitedBy: string;
  invitedAt: TimestampValue;
  respondedAt?: TimestampValue;
}

export interface TeacherRequest {
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: TimestampValue;
  respondedAt?: TimestampValue;
  reviewedBy?: string;
}

export interface User {
  uid: string;
  firstName: string;
  lastName: string;
  fullName: string;
  username: string;
  phone: string;
  email: string;
  role: UserRole;
  deleted: boolean;
  profileCompleted: boolean;
  status: 'active' | 'inactive';
  createdAt: TimestampValue;
  adminInvitation?: AdminInvitation | null;
  teacherRequest?: TeacherRequest | null;
}

export interface AuditLog {
  id?: string;
  action: string;
  performedBy: string;
  targetUser: string;
  metadata?: Record<string, unknown>;
  timestamp: TimestampValue;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: string;
}

export interface Quiz {
  id?: string;
  courseId: string;
  title: string;
  description: string;
  passingScore: number;
  questions: Question[];
  createdBy: string;
  updatedAt: Date;
}

export interface QuizAttempt {
  id?: string;
  quizId: string;
  courseId: string;
  studentUid: string;
  answers: string[];
  score: number;
  passed: boolean;
  attemptedAt: Date;
}

export interface Certificate {
  id?: string;
  studentUid: string;
  courseId: string;
  courseName: string;
  studentName: string;
  issuedAt: TimestampValue;
}

export interface AppNotification {
  id?: string;
  title: string;
  message: string;
  type: 'course_approved' | 'course_rejected' | 'new_enrollment' | 'announcement' | 'quiz_passed' | string;
  link?: string;
  read: boolean;
  createdAt: TimestampValue;
}

export interface Announcement {
  id?: string;
  courseId: string;
  teacherUid: string;
  title: string;
  body: string;
  createdAt: TimestampValue;
}

export interface DiscussionThread {
  id?: string;
  courseId: string;
  authorUid: string;
  authorName: string;
  title: string;
  body: string;
  replyCount: number;
  createdAt: TimestampValue;
}

export interface DiscussionReply {
  id?: string;
  threadId: string;
  authorUid: string;
  authorName: string;
  body: string;
  createdAt: TimestampValue;
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'link';
  videoUrl?: string;
  content?: string;
  durationMin?: number;
}

export interface CourseSection {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface CourseContent {
  sections: CourseSection[];
}
