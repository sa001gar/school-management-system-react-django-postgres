/**
 * Core Services API
 * API functions for core entities: Sessions, Classes, Sections, Subjects, Students, etc.
 */
import api from './client';
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
  ClassConfigResponse,
  StudentEnrollment,
  TeacherAssignment,
  ClassTeacher,
} from '@/types';

// Sessions API
export const sessionsApi = {
  getAll: async (): Promise<Session[]> => {
    const response = await api.get<{ results?: Session[] } | Session[]>('/sessions/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${id}/`);
  },

  getActive: async (): Promise<Session | null> => {
    const sessions = await sessionsApi.getAll();
    return sessions.find(s => s.is_active) || null;
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

  lock: async (id: string): Promise<Session> => {
    return api.post<Session>(`/sessions/${id}/lock/`);
  },

  unlock: async (id: string): Promise<Session> => {
    return api.post<Session>(`/sessions/${id}/unlock/`);
  },
};

// Classes API
export const classesApi = {
  getAll: async (): Promise<Class[]> => {
    const response = await api.get<{ results?: Class[] } | Class[]>('/classes/');
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Class> => {
    return api.get<Class>(`/classes/${id}/`);
  },

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

  bulkUpdate: async (data: { class_id: string; subject_ids: string[] }): Promise<void> => {
    return api.post<void>('/class-subject-assignments/bulk-update/', data);
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
    const response = await api.get<{ results?: SchoolConfig[] } | SchoolConfig[]>('/school-config/');
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
    const response = await api.get<PaginatedResponse<Student>>('/students/', {
      ...params,
      page_size: 1000,
    });
    return response.results || [];
  },

  getByFilters: async (sessionId: string, classId: string, sectionId: string): Promise<Student[]> => {
    const response = await api.get<{ results?: Student[] } | Student[]>('/students/', {
      session_id: sessionId,
      class_id: classId,
      section_id: sectionId,
    });
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<Student> => {
    return api.get<Student>(`/students/${id}/`);
  },

  create: async (data: Partial<Student>): Promise<Student> => {
    return api.post<Student>('/students/', data);
  },

  update: async (id: string, data: Partial<Student>): Promise<Student> => {
    return api.patch<Student>(`/students/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/students/${id}/`);
  },

  bulkCreate: async (students: Partial<Student>[]): Promise<Student[]> => {
    return api.post<Student[]>('/students/bulk-create/', { students });
  },

  // Create student with profile picture
  createWithImage: async (data: Partial<Student>, imageFile?: File | null): Promise<Student> => {
    if (!imageFile) {
      // No image, use regular JSON API
      return api.post<Student>('/students/', data);
    }

    const formData = new FormData();
    
    // Append all data fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    // Append image file
    formData.append('profile_pic', imageFile);
    
    return api.postFormData<Student>('/students/', formData);
  },

  // Update student with profile picture
  updateWithImage: async (id: string, data: Partial<Student>, imageFile?: File | null): Promise<Student> => {
    if (!imageFile) {
      // No new image, use regular JSON API
      return api.patch<Student>(`/students/${id}/`, data);
    }

    const formData = new FormData();
    
    // Append all data fields
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formData.append(key, String(value));
      }
    });
    
    // Append image file
    formData.append('profile_pic', imageFile);
    
    return api.patchFormData<Student>(`/students/${id}/`, formData);
  },
};

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

  promote: async (data: {
    enrollment_id: string;
    new_class_id: string;
    new_section_id: string;
    new_session_id: string;
    new_roll_no: string;
  }): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/promote/', data);
  },

  bulkPromote: async (promotions: Array<{
    enrollment_id: string;
    new_class_id: string;
    new_section_id: string;
    new_session_id: string;
    new_roll_no: string;
  }>): Promise<StudentEnrollment[]> => {
    return api.post<StudentEnrollment[]>('/student-enrollments/bulk-promote/', { promotions });
  },

  retain: async (data: {
    enrollment_id: string;
    new_session_id: string;
    new_roll_no?: string;
  }): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/retain/', data);
  },

  transfer: async (data: {
    enrollment_id: string;
    remarks?: string;
  }): Promise<StudentEnrollment> => {
    return api.post<StudentEnrollment>('/student-enrollments/transfer/', data);
  },
};

// Teacher Assignments API
export const teacherAssignmentsApi = {
  getAll: async (params?: {
    teacher_id?: string;
    session_id?: string;
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

// Class Teachers API
export const classTeachersApi = {
  getAll: async (params?: {
    session_id?: string;
    teacher_id?: string;
  }): Promise<ClassTeacher[]> => {
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

  delete: async (id: string): Promise<void> => {
    await api.delete(`/class-teachers/${id}/`);
  },
};
