/**
 * Core Services API
 * API functions for core entities: Sessions, Classes, Sections, Subjects, Students, etc.
 */
import api from './api';
import type {
  Session,
  Class,
  Section,
  Subject,
  CocurricularSubject,
  OptionalSubject,
  ClassSubjectAssignment,
  ClassOptionalConfig,
  ClassOptionalAssignment,
  ClassCocurricularConfig,
  ClassMarksDistribution,
  SchoolConfig,
  Student,
  PaginatedResponse,
} from './types';

// Sessions API
export const sessionsApi = {
  getAll: async (): Promise<Session[]> => {
    const response = await api.get<{ results?: Session[] } | Session[]>('/sessions/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${id}/`);
  },

  create: async (data: Partial<Session>): Promise<Session> => {
    return api.post<Session>('/sessions/', data);
  },

  update: async (id: string, data: Partial<Session>): Promise<Session> => {
    return api.patch<Session>(`/sessions/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sessions/${id}/`);
  },
};

// Class configuration response type
export interface ClassConfigResponse {
  class: Class;
  sections: Section[];
  subject_assignments: ClassSubjectAssignment[];
  optional_config: ClassOptionalConfig | null;
  optional_assignments: ClassOptionalAssignment[];
  cocurricular_config: ClassCocurricularConfig | null;
  marks_distribution: ClassMarksDistribution | null;
}

// Classes API
export const classesApi = {
  getAll: async (): Promise<Class[]> => {
    const response = await api.get<{ results?: Class[] } | Class[]>('/classes/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Class> => {
    return api.get<Class>(`/classes/${id}/`);
  },

  /**
   * Get all configurations for a class in a single API call
   * Includes sections, subject assignments, optional config, cocurricular config, marks distribution
   */
  getConfig: async (id: string): Promise<ClassConfigResponse> => {
    return api.get<ClassConfigResponse>(`/classes/${id}/config/`);
  },

  create: async (data: Partial<Class>): Promise<Class> => {
    return api.post<Class>('/classes/', data);
  },

  update: async (id: string, data: Partial<Class>): Promise<Class> => {
    return api.patch<Class>(`/classes/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/classes/${id}/`);
  },
};

// Sections API
export const sectionsApi = {
  getAll: async (classId?: string): Promise<Section[]> => {
    const response = await api.get<{ results?: Section[] } | Section[]>('/sections/', { class_id: classId });
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Section> => {
    return api.get<Section>(`/sections/${id}/`);
  },

  getByClass: async (classId: string): Promise<Section[]> => {
    const response = await api.get<{ results?: Section[] } | Section[]>('/sections/', { class_id: classId });
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: { name: string; class_id: string }): Promise<Section> => {
    return api.post<Section>('/sections/', data);
  },

  update: async (id: string, data: Partial<Section>): Promise<Section> => {
    return api.patch<Section>(`/sections/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/sections/${id}/`);
  },
};

// Subjects API
export const subjectsApi = {
  getAll: async (): Promise<Subject[]> => {
    const response = await api.get<{ results?: Subject[] } | Subject[]>('/subjects/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Subject> => {
    return api.get<Subject>(`/subjects/${id}/`);
  },

  create: async (data: Partial<Subject>): Promise<Subject> => {
    return api.post<Subject>('/subjects/', data);
  },

  update: async (id: string, data: Partial<Subject>): Promise<Subject> => {
    return api.patch<Subject>(`/subjects/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/subjects/${id}/`);
  },
};

// Cocurricular Subjects API
export const cocurricularSubjectsApi = {
  getAll: async (): Promise<CocurricularSubject[]> => {
    const response = await api.get<{ results?: CocurricularSubject[] } | CocurricularSubject[]>('/cocurricular-subjects/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<CocurricularSubject> => {
    return api.get<CocurricularSubject>(`/cocurricular-subjects/${id}/`);
  },

  create: async (data: Partial<CocurricularSubject>): Promise<CocurricularSubject> => {
    return api.post<CocurricularSubject>('/cocurricular-subjects/', data);
  },

  update: async (id: string, data: Partial<CocurricularSubject>): Promise<CocurricularSubject> => {
    return api.patch<CocurricularSubject>(`/cocurricular-subjects/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cocurricular-subjects/${id}/`);
  },
};

// Optional Subjects API
export const optionalSubjectsApi = {
  getAll: async (): Promise<OptionalSubject[]> => {
    const response = await api.get<{ results?: OptionalSubject[] } | OptionalSubject[]>('/optional-subjects/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<OptionalSubject> => {
    return api.get<OptionalSubject>(`/optional-subjects/${id}/`);
  },

  create: async (data: Partial<OptionalSubject>): Promise<OptionalSubject> => {
    return api.post<OptionalSubject>('/optional-subjects/', data);
  },

  update: async (id: string, data: Partial<OptionalSubject>): Promise<OptionalSubject> => {
    return api.patch<OptionalSubject>(`/optional-subjects/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/optional-subjects/${id}/`);
  },
};

// Class Subject Assignments API
export const classSubjectAssignmentsApi = {
  getByClass: async (classId: string): Promise<ClassSubjectAssignment[]> => {
    const response = await api.get<{ results?: ClassSubjectAssignment[] } | ClassSubjectAssignment[]>(
      '/class-subject-assignments/',
      { class_id: classId }
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: { class_id: string; subject_id: string; is_required?: boolean }): Promise<ClassSubjectAssignment> => {
    return api.post<ClassSubjectAssignment>('/class-subject-assignments/', data);
  },

  update: async (id: string, data: Partial<ClassSubjectAssignment>): Promise<ClassSubjectAssignment> => {
    return api.patch<ClassSubjectAssignment>(`/class-subject-assignments/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/class-subject-assignments/${id}/`);
  },
};

// Class Optional Config API
export const classOptionalConfigApi = {
  getByClass: async (classId: string): Promise<ClassOptionalConfig | null> => {
    const response = await api.get<{ results?: ClassOptionalConfig[] } | ClassOptionalConfig[]>(
      '/class-optional-config/',
      { class_id: classId }
    );
    const results = Array.isArray(response) ? response : (response.results || []);
    return results[0] || null;
  },

  getAll: async (): Promise<ClassOptionalConfig[]> => {
    const response = await api.get<{ results?: ClassOptionalConfig[] } | ClassOptionalConfig[]>(
      '/class-optional-config/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  /**
   * Get optional configs for multiple classes in one request
   */
  getByClasses: async (classIds: string[]): Promise<ClassOptionalConfig[]> => {
    if (!classIds.length) return [];
    return api.post<ClassOptionalConfig[]>('/class-optional-config/by-classes/', { class_ids: classIds });
  },

  create: async (data: { class_id: string; has_optional: boolean }): Promise<ClassOptionalConfig> => {
    return api.post<ClassOptionalConfig>('/class-optional-config/', data);
  },

  update: async (id: string, data: Partial<ClassOptionalConfig>): Promise<ClassOptionalConfig> => {
    return api.patch<ClassOptionalConfig>(`/class-optional-config/${id}/`, data);
  },
};

// Class Optional Assignments API
export const classOptionalAssignmentsApi = {
  getByClass: async (classId: string): Promise<ClassOptionalAssignment[]> => {
    const response = await api.get<{ results?: ClassOptionalAssignment[] } | ClassOptionalAssignment[]>(
      '/class-optional-assignments/',
      { class_id: classId }
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getAll: async (): Promise<ClassOptionalAssignment[]> => {
    const response = await api.get<{ results?: ClassOptionalAssignment[] } | ClassOptionalAssignment[]>(
      '/class-optional-assignments/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  /**
   * Get optional assignments for multiple classes in one request
   */
  getByClasses: async (classIds: string[]): Promise<ClassOptionalAssignment[]> => {
    if (!classIds.length) return [];
    return api.post<ClassOptionalAssignment[]>('/class-optional-assignments/by-classes/', { class_ids: classIds });
  },

  create: async (data: { class_id: string; optional_subject_id: string; full_marks?: number; is_required?: boolean }): Promise<ClassOptionalAssignment> => {
    return api.post<ClassOptionalAssignment>('/class-optional-assignments/', data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/class-optional-assignments/${id}/`);
  },
};

// Class Cocurricular Config API
export const classCocurricularConfigApi = {
  getAll: async (): Promise<ClassCocurricularConfig[]> => {
    const response = await api.get<{ results?: ClassCocurricularConfig[] } | ClassCocurricularConfig[]>(
      '/class-cocurricular-config/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getByClass: async (classId: string): Promise<ClassCocurricularConfig | null> => {
    const response = await api.get<{ results?: ClassCocurricularConfig[] } | ClassCocurricularConfig[]>(
      '/class-cocurricular-config/',
      { class_id: classId }
    );
    const results = Array.isArray(response) ? response : (response.results || []);
    return results[0] || null;
  },

  create: async (data: { class_id: string; has_cocurricular: boolean }): Promise<ClassCocurricularConfig> => {
    return api.post<ClassCocurricularConfig>('/class-cocurricular-config/', data);
  },

  update: async (id: string, data: Partial<ClassCocurricularConfig>): Promise<ClassCocurricularConfig> => {
    return api.patch<ClassCocurricularConfig>(`/class-cocurricular-config/${id}/`, data);
  },
};

// Class Marks Distribution API
export const classMarksDistributionApi = {
  getAll: async (): Promise<ClassMarksDistribution[]> => {
    const response = await api.get<{ results?: ClassMarksDistribution[] } | ClassMarksDistribution[]>(
      '/class-marks-distribution/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getByClass: async (classId: string): Promise<ClassMarksDistribution | null> => {
    const response = await api.get<{ results?: ClassMarksDistribution[] } | ClassMarksDistribution[]>(
      '/class-marks-distribution/',
      { class_id: classId }
    );
    const results = Array.isArray(response) ? response : (response.results || []);
    return results[0] || null;
  },

  /**
   * Get marks distributions for multiple classes in one request
   */
  getByClasses: async (classIds: string[]): Promise<ClassMarksDistribution[]> => {
    if (!classIds.length) return [];
    return api.post<ClassMarksDistribution[]>('/class-marks-distribution/by-classes/', { class_ids: classIds });
  },

  create: async (data: { class_id: string } & Partial<ClassMarksDistribution>): Promise<ClassMarksDistribution> => {
    return api.post<ClassMarksDistribution>('/class-marks-distribution/', data);
  },

  update: async (id: string, data: Partial<ClassMarksDistribution>): Promise<ClassMarksDistribution> => {
    return api.patch<ClassMarksDistribution>(`/class-marks-distribution/${id}/`, data);
  },
};

// School Config API
export const schoolConfigApi = {
  getAll: async (): Promise<SchoolConfig[]> => {
    const response = await api.get<{ results?: SchoolConfig[] } | SchoolConfig[]>(
      '/school-config/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  get: async (classId?: string, sessionId?: string): Promise<SchoolConfig | null> => {
    const response = await api.get<{ results?: SchoolConfig[] } | SchoolConfig[]>(
      '/school-config/',
      { class_id: classId, session_id: sessionId }
    );
    const results = Array.isArray(response) ? response : (response.results || []);
    return results[0] || null;
  },

  /**
   * Get school configs for multiple classes in one request
   */
  getByClasses: async (classIds: string[], sessionId?: string): Promise<SchoolConfig[]> => {
    if (!classIds.length) return [];
    return api.post<SchoolConfig[]>('/school-config/by-classes/', { 
      class_ids: classIds,
      session_id: sessionId
    });
  },

  create: async (data: Partial<SchoolConfig>): Promise<SchoolConfig> => {
    return api.post<SchoolConfig>('/school-config/', data);
  },

  update: async (id: string, data: Partial<SchoolConfig>): Promise<SchoolConfig> => {
    return api.patch<SchoolConfig>(`/school-config/${id}/`, data);
  },
};

// Students API
export const studentsApi = {
  getAll: async (params?: {
    class_id?: string;
    section_id?: string;
    session_id?: string;
    search?: string;
    page?: number;
  }): Promise<PaginatedResponse<Student>> => {
    return api.get<PaginatedResponse<Student>>('/students/', params);
  },

  getAllUnpaginated: async (params?: {
    class_id?: string;
    section_id?: string;
    session_id?: string;
  }): Promise<Student[]> => {
    // For now, get all results by setting a high page size or iterating
    const response = await api.get<{ results?: Student[] } | Student[]>('/students/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  getByFilters: async (
    sessionId?: string, 
    classId?: string, 
    sectionId?: string
  ): Promise<Student[]> => {
    const params: Record<string, string> = {};
    if (sessionId) params.session_id = sessionId;
    if (classId) params.class_id = classId;
    if (sectionId) params.section_id = sectionId;
    const response = await api.get<{ results?: Student[] } | Student[]>('/students/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Student> => {
    return api.get<Student>(`/students/${id}/`);
  },

  create: async (data: {
    roll_no: string;
    name: string;
    class_id?: string;
    section_id?: string;
    session_id?: string;
  }): Promise<Student> => {
    return api.post<Student>('/students/', data);
  },

  update: async (id: string, data: Partial<{
    roll_no: string;
    name: string;
    class_id: string;
    section_id: string;
    session_id: string;
  }>): Promise<Student> => {
    return api.patch<Student>(`/students/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}/`);
  },

  bulkCreate: async (students: Array<{
    roll_no: string;
    name: string;
    class_id?: string;
    section_id?: string;
    session_id?: string;
  }>): Promise<Student[]> => {
    return api.post<Student[]>('/students/bulk/', { students });
  },
};

// ============================================================================
// SMS UPGRADE - New API Endpoints
// ============================================================================

import type {
  StudentEnrollment,
  ClassTeacher,
  TeacherAssignment,
  CocurricularTeacherAssignment,
  OptionalTeacherAssignment,
  StudentPromotionRequest,
  BulkPromotionRequest,
  StudentRetentionRequest,
  StudentTransferRequest,
  AdminDashboardStats,
  TeacherAssignmentsResponse,
  TeacherPendingTasksResponse,
  MarksEntryAuthorizationResponse,
  StudentLoginResponse,
  StudentFeesSummary,
  MarksheetResponse,
  MarksheetBlockedResponse,
} from './types';

// Student Enrollments API
export const studentEnrollmentsApi = {
  getAll: async (params?: {
    session_id?: string;
    class_id?: string;
    section_id?: string;
    status?: string;
  }): Promise<StudentEnrollment[]> => {
    const response = await api.get<{ results?: StudentEnrollment[] } | StudentEnrollment[]>(
      '/student-enrollments/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<StudentEnrollment> => {
    return api.get<StudentEnrollment>(`/student-enrollments/${id}/`);
  },

  create: async (data: {
    student_id: string;
    session_id: string;
    class_id: string;
    section_id: string;
    roll_no: string;
  }): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/', data);
  },

  promote: async (data: StudentPromotionRequest): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/promote/', data);
  },

  bulkPromote: async (data: BulkPromotionRequest): Promise<StudentEnrollment[]> => {
    return api.post<StudentEnrollment[]>('/student-enrollments/bulk-promote/', data);
  },

  retain: async (data: StudentRetentionRequest): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/retain/', data);
  },

  transfer: async (data: StudentTransferRequest): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/transfer/', data);
  },
};

// Class Teachers API
export const classTeachersApi = {
  getAll: async (sessionId?: string): Promise<ClassTeacher[]> => {
    const params = sessionId ? { session_id: sessionId } : undefined;
    const response = await api.get<{ results?: ClassTeacher[] } | ClassTeacher[]>(
      '/class-teachers/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: {
    teacher_id: string;
    class_id: string;
    section_id: string;
    session_id: string;
  }): Promise<ClassTeacher> => {
    return api.post<ClassTeacher>('/class-teachers/', data);
  },

  update: async (id: string, data: Partial<ClassTeacher>): Promise<ClassTeacher> => {
    return api.patch<ClassTeacher>(`/class-teachers/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/class-teachers/${id}/`);
  },
};

// Teacher Assignments API (Regular Subjects)
export const teacherAssignmentsApi = {
  getAll: async (params?: {
    teacher_id?: string;
    session_id?: string;
    class_id?: string;
  }): Promise<TeacherAssignment[]> => {
    const response = await api.get<{ results?: TeacherAssignment[] } | TeacherAssignment[]>(
      '/teacher-assignments/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: {
    teacher_id: string;
    class_id: string;
    section_id: string;
    subject_id: string;
    session_id: string;
  }): Promise<TeacherAssignment> => {
    return api.post<TeacherAssignment>('/teacher-assignments/', data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/teacher-assignments/${id}/`);
  },
};

// Cocurricular Teacher Assignments API
export const cocurricularTeacherAssignmentsApi = {
  getAll: async (sessionId?: string): Promise<CocurricularTeacherAssignment[]> => {
    const params = sessionId ? { session_id: sessionId } : undefined;
    const response = await api.get<{ results?: CocurricularTeacherAssignment[] } | CocurricularTeacherAssignment[]>(
      '/cocurricular-teacher-assignments/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: {
    teacher_id: string;
    class_id: string;
    section_id: string;
    cocurricular_subject_id: string;
    session_id: string;
  }): Promise<CocurricularTeacherAssignment> => {
    return api.post<CocurricularTeacherAssignment>('/cocurricular-teacher-assignments/', data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cocurricular-teacher-assignments/${id}/`);
  },
};

// Optional Teacher Assignments API
export const optionalTeacherAssignmentsApi = {
  getAll: async (sessionId?: string): Promise<OptionalTeacherAssignment[]> => {
    const params = sessionId ? { session_id: sessionId } : undefined;
    const response = await api.get<{ results?: OptionalTeacherAssignment[] } | OptionalTeacherAssignment[]>(
      '/optional-teacher-assignments/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: {
    teacher_id: string;
    class_id: string;
    section_id: string;
    optional_subject_id: string;
    session_id: string;
  }): Promise<OptionalTeacherAssignment> => {
    return api.post<OptionalTeacherAssignment>('/optional-teacher-assignments/', data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/optional-teacher-assignments/${id}/`);
  },
};

// Session Management API
export const sessionManagementApi = {
  lockSession: async (sessionId: string): Promise<{ message: string; session: Session }> => {
    return api.post('/admin/session-lock/', { session_id: sessionId });
  },
};

// Admin Dashboard API
export const adminDashboardApi = {
  getStats: async (): Promise<AdminDashboardStats> => {
    return api.get<AdminDashboardStats>('/admin/dashboard-stats/');
  },
};

// Teacher Dashboard API
export const teacherDashboardApi = {
  getMyAssignments: async (): Promise<TeacherAssignmentsResponse> => {
    return api.get<TeacherAssignmentsResponse>('/teacher/my-assignments/');
  },

  getPendingTasks: async (): Promise<TeacherPendingTasksResponse> => {
    return api.get<TeacherPendingTasksResponse>('/teacher/pending-tasks/');
  },

  checkMarksAuthorization: async (params: {
    class_id: string;
    section_id: string;
    subject_id: string;
    session_id: string;
  }): Promise<MarksEntryAuthorizationResponse> => {
    return api.get<MarksEntryAuthorizationResponse>('/teacher/check-marks-authorization/', params);
  },
};

// Marksheet Generation API (with fee validation)
export const marksheetApi = {
  getStudentMarksheet: async (
    studentId: string,
    sessionId?: string,
    skipFeeCheck?: boolean
  ): Promise<MarksheetResponse | MarksheetBlockedResponse> => {
    const params: Record<string, string> = { student_id: studentId };
    if (sessionId) params.session_id = sessionId;
    if (skipFeeCheck) params.skip_fee_check = 'true';
    return api.get('/marksheet/', params);
  },

  getClassMarksheet: async (
    classId: string,
    sectionId: string,
    sessionId: string,
    skipFeeCheck?: boolean
  ): Promise<any> => {
    const params: Record<string, string> = {
      class_id: classId,
      section_id: sectionId,
      session_id: sessionId,
    };
    if (skipFeeCheck) params.skip_fee_check = 'true';
    return api.get('/marksheet/', params);
  },
};

// Student Portal API (for student self-service)
export const studentPortalApi = {
  login: async (studentId: string, password: string): Promise<StudentLoginResponse> => {
    return api.post<StudentLoginResponse>('/auth/student-login/', {
      student_id: studentId,
      password,
    });
  },

  getProfile: async (): Promise<{ student: Student }> => {
    return api.get('/student/me/');
  },

  getFees: async (): Promise<StudentFeesSummary> => {
    return api.get<StudentFeesSummary>('/student/fees/');
  },
};

// Re-export all APIs
export {
  sessionsApi as sessions,
  classesApi as classes,
  sectionsApi as sections,
  subjectsApi as subjects,
  cocurricularSubjectsApi as cocurricularSubjects,
  optionalSubjectsApi as optionalSubjects,
  classSubjectAssignmentsApi as classSubjectAssignments,
  classOptionalConfigApi as classOptionalConfig,
  classOptionalAssignmentsApi as classOptionalAssignments,
  classCocurricularConfigApi as classCocurricularConfig,
  classMarksDistributionApi as classMarksDistribution,
  schoolConfigApi as schoolConfig,
  studentsApi as students,
  // SMS Upgrade APIs
  studentEnrollmentsApi as studentEnrollments,
  classTeachersApi as classTeachers,
  teacherAssignmentsApi as teacherAssignments,
  cocurricularTeacherAssignmentsApi as cocurricularTeacherAssignments,
  optionalTeacherAssignmentsApi as optionalTeacherAssignments,
  sessionManagementApi as sessionManagement,
  adminDashboardApi as adminDashboard,
  teacherDashboardApi as teacherDashboard,
  marksheetApi as marksheet,
  studentPortalApi as studentPortal,
};
