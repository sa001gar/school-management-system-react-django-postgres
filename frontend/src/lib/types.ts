/**
 * TypeScript Types for Django Backend API
 * These types match the Django models and serializers
 */

// Auth Types
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'teacher';
  is_active: boolean;
}

export interface Teacher {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
  teacher: Teacher | null;
  admin: Admin | null;
}

export interface CurrentUserResponse {
  user: User;
  teacher: Teacher | null;
  admin: Admin | null;
}

// Core Models
export interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: number;
  created_at: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  class_name?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  full_marks: number;
  created_at: string;
}

export interface CocurricularSubject {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface OptionalSubject {
  id: string;
  name: string;
  code: string;
  default_full_marks: number;
  created_at: string;
}

export interface ClassSubjectAssignment {
  id: string;
  class_id: string;
  subject: Subject;
  subject_id?: string;
  is_required: boolean;
  created_at: string;
}

export interface ClassOptionalConfig {
  id: string;
  class_id: string;
  has_optional: boolean;
  created_at: string;
}

export interface ClassOptionalAssignment {
  id: string;
  class_id: string;
  optional_subject: OptionalSubject;
  optional_subject_id?: string;
  full_marks: number;
  is_required: boolean;
  created_at: string;
}

export interface ClassCocurricularConfig {
  id: string;
  class_id: string;
  has_cocurricular: boolean;
  created_at: string;
}

export interface ClassMarksDistribution {
  id: string;
  class_id: string;
  first_summative_marks: number;
  first_formative_marks: number;
  second_summative_marks: number;
  second_formative_marks: number;
  third_summative_marks: number;
  third_formative_marks: number;
  number_of_unit_tests: number;
  has_final_term: boolean;
  unit_test_marks: number;
  formative_marks: number;
  final_term_marks: number;
  total_marks: number;
  created_at: string;
  updated_at: string;
}

export interface SchoolConfig {
  id: string;
  class_id: string | null;
  session_id: string | null;
  total_school_days: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  student_id: string;  // Permanent unique student identifier
  roll_no: string;
  name: string;
  class_id: string | null;
  section_id: string | null;
  session_id: string | null;
  created_at: string;
  // Detail fields
  class_info?: Class;
  section_info?: Section;
  session_info?: Session;
}

// Result Types
export interface StudentResult {
  id: string;
  student_id: string;
  subject_id: string;
  session_id: string;
  first_summative_full: number;
  first_summative_obtained: number;
  first_formative_full: number;
  first_formative_obtained: number;
  second_summative_full: number;
  second_summative_obtained: number;
  second_formative_full: number;
  second_formative_obtained: number;
  third_summative_full: number;
  third_summative_obtained: number;
  third_formative_full: number;
  third_formative_obtained: number;
  total_marks: number;
  grade: string;
  conduct: string;
  attendance_days: number;
  created_at: string;
  updated_at: string;
  // Detail fields
  student?: Student;
  subject?: Subject;
  session?: Session;
}

export interface StudentCocurricularResult {
  id: string;
  student_id: string;
  cocurricular_subject_id: string;
  session_id: string;
  first_term_marks: number;
  second_term_marks: number;
  final_term_marks: number;
  full_marks: number;
  total_marks: number;
  first_term_grade: string;
  second_term_grade: string;
  final_term_grade: string;
  overall_grade: string;
  created_at: string;
  updated_at: string;
  // Detail fields
  student?: Student;
  cocurricular_subject?: CocurricularSubject;
  session?: Session;
}

export interface StudentOptionalResult {
  id: string;
  student_id: string;
  optional_subject_id: string;
  session_id: string;
  obtained_marks: number;
  full_marks: number;
  grade: string;
  created_at: string;
  updated_at: string;
  // Detail fields
  student?: Student;
  optional_subject?: OptionalSubject;
  session?: Session;
}

// Payment Types
export interface FeeStructure {
  id: string;
  name: string;
  description: string | null;
  class_id: string;
  session_id: string;
  tuition_fee: number;
  admission_fee: number;
  library_fee: number;
  lab_fee: number;
  sports_fee: number;
  exam_fee: number;
  miscellaneous_fee: number;
  total_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Detail fields
  class_info?: Class;
  session_info?: Session;
}

export interface FeeDiscount {
  id: string;
  name: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentFee {
  id: string;
  student_id: string;
  fee_structure_id: string;
  session_id: string;
  discount_id: string | null;
  gross_amount: number;
  discount_amount: number;
  net_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string | null;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'waived';
  created_at: string;
  updated_at: string;
  // Detail fields
  student?: Student;
  fee_structure?: FeeStructure;
  session?: Session;
  discount?: FeeDiscount;
}

export interface Payment {
  id: string;
  student_fee_id: string;
  amount: number;
  payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'other';
  transaction_id: string | null;
  reference_number: string | null;
  receipt_number: string;
  payment_date: string;
  remarks: string | null;
  received_by_id: string | null;
  created_at: string;
  updated_at: string;
  // Detail fields
  student_fee?: StudentFee;
}

export interface PaymentReminder {
  id: string;
  student_fee_id: string;
  reminder_date: string;
  message: string;
  status: 'scheduled' | 'sent' | 'cancelled';
  sent_at: string | null;
  created_at: string;
}

// Marksheet Types
export interface MarksheetSummary {
  total_marks: number;
  total_full_marks: number;
  optional_total: number;
  optional_full: number;
  grand_total: number;
  grand_full: number;
  percentage: number;
  overall_grade: string;
}

export interface StudentMarksheet {
  student: {
    id: string;
    roll_no: string;
    name: string;
    class: string | null;
    section: string | null;
    session: string | null;
  };
  results: StudentResult[];
  cocurricular_results: StudentCocurricularResult[];
  optional_results: StudentOptionalResult[];
  summary: MarksheetSummary;
}

// API Response Types
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface FeeSummary {
  total_students: number;
  total_net_amount: number;
  total_paid_amount: number;
  total_pending_amount: number;
  collection_percentage: number;
  status_counts: {
    paid: number;
    partial: number;
    pending: number;
    overdue: number;
    waived: number;
  };
}

export interface DailyCollection {
  date: string;
  total_collection: number;
  total_transactions: number;
  by_payment_method: Record<string, number>;
}

// Student with result for marks entry
export interface StudentWithResult extends Student {
  result?: StudentResult;
}

// Assigned subject with completion status
export interface AssignedSubject extends Subject {
  isAssigned: boolean;
  completionStatus: {
    totalStudents: number;
    studentsWithMarks: number;
    isComplete: boolean;
  };
}

// ============================================================================
// SMS UPGRADE - New Types for Session-based Student Management
// ============================================================================

// Session with lock status
export interface Session {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_locked: boolean;
  created_at: string;
}

// Student Enrollment Status
export type EnrollmentStatus = 'active' | 'promoted' | 'retained' | 'transferred' | 'graduated' | 'dropped';

// Student Enrollment (Session-wise)
export interface StudentEnrollment {
  id: string;
  student_id: string;
  student_name: string;
  student_permanent_id: string;
  session_id: string;
  session_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  roll_no: string;
  status: EnrollmentStatus;
  promotion_date: string | null;
  remarks: string;
  created_at: string;
}

// Class Teacher Assignment
export interface ClassTeacher {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  session_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

// Cocurricular Teacher Assignment
export interface CocurricularTeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  cocurricular_subject_name: string;
  class_name: string;
  section_name: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

// Optional Teacher Assignment
export interface OptionalTeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  optional_subject_name: string;
  class_name: string;
  section_name: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

// Teacher Assignment (Regular Subjects)
export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  session_id: string;
  session_name: string;
  is_active: boolean;
  created_at: string;
}

// Student Promotion Request
export interface StudentPromotionRequest {
  enrollment_id: string;
  new_class_id: string;
  new_section_id: string;
  new_session_id: string;
  new_roll_no: string;
}

// Bulk Promotion Request
export interface BulkPromotionRequest {
  promotions: StudentPromotionRequest[];
}

// Student Retention Request
export interface StudentRetentionRequest {
  enrollment_id: string;
  new_session_id: string;
  new_roll_no?: string;
}

// Student Transfer Request
export interface StudentTransferRequest {
  enrollment_id: string;
  remarks?: string;
}

// Fee Clearance Status
export interface FeeClearanceStatus {
  is_cleared: boolean;
  pending_amount: number;
  last_payment_date: string | null;
}

// Marksheet Generation Response
export interface MarksheetResponse {
  student?: Student;
  results: StudentResult[];
  cocurricular_results: StudentCocurricularResult[];
  optional_results: StudentOptionalResult[];
  summary: MarksheetSummary;
  fee_status: 'cleared' | 'pending';
}

// Marksheet Generation Error (Fee Pending)
export interface MarksheetBlockedResponse {
  error: string;
  message: string;
  students_with_pending_fees?: Array<{
    id: string;
    student_id: string;
    name: string;
  }>;
  fee_status?: 'pending';
}

// Admin Dashboard Stats
export interface AdminDashboardStats {
  session: Session | null;
  counts: {
    total_students: number;
    session_students: number;
    total_teachers: number;
    total_classes: number;
  };
  fees: {
    total_fees: string;
    total_collected: string;
    pending: string;
    collection_rate: number;
  };
  recent_payments: Payment[];
  class_distribution: Array<{
    class_name: string;
    count: number;
  }>;
}

// Teacher's Pending Tasks
export interface TeacherPendingTask {
  assignment_id: string;
  class_id: string;
  class_name: string;
  section_id: string;
  section_name: string;
  subject_id: string;
  subject_name: string;
  total_students: number;
  first_term: {
    entered: number;
    total: number;
    progress: number;
  };
  second_term: {
    entered: number;
    total: number;
    progress: number;
  };
  third_term: {
    entered: number;
    total: number;
    progress: number;
  };
}

// Teacher's Assignments Response
export interface TeacherAssignmentsResponse {
  teacher: Teacher;
  assignments: TeacherAssignment[];
  session: Session | null;
}

// Teacher's Pending Tasks Response
export interface TeacherPendingTasksResponse {
  teacher: Teacher;
  pending_tasks: TeacherPendingTask[];
  session: Session | null;
}

// Marks Entry Authorization Check
export interface MarksEntryAuthorizationResponse {
  is_authorized: boolean;
  error: string | null;
  class: Class;
  section: Section;
  subject: Subject;
  session: Session;
}

// Student Portal Login Response
export interface StudentLoginResponse {
  access: string;
  refresh: string;
  student: Student;
}

// Student Fees Summary
export interface StudentFeesSummary {
  student: Student;
  fees: StudentFee[];
  payments: Payment[];
  summary: {
    total_gross: string;
    total_discount: string;
    total_net: string;
    total_paid: string;
    balance: string;
  };
}

// Extended Student with additional fields
export interface StudentExtended extends Student {
  guardian_name?: string;
  guardian_relation?: string;
  alternate_phone?: string;
  email?: string | null;
  admission_date?: string | null;
  admission_class_id?: string | null;
  admission_session_id?: string | null;
}

