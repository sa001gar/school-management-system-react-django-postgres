/**
 * Results API Service
 * API functions for result management
 */
import api from './client';
import type {
  StudentResult,
  StudentCocurricularResult,
  StudentOptionalResult,
  StudentMarksheet,
  StudentWithResult,
  PaginatedResponse,
  MarksheetResponse,
  SubjectMark,
  CocurricularGrade,
  SubjectAssignment,
  ExamType,
} from '@/types';

// Student Results API
export const studentResultsApi = {
  getAll: async (params?: {
    student_id?: string;
    subject_id?: string;
    session_id?: string;
    page?: number;
  }): Promise<PaginatedResponse<StudentResult>> => {
    return api.get<PaginatedResponse<StudentResult>>('/results/student-results/', params);
  },

  getById: async (id: string): Promise<StudentResult> => {
    return api.get<StudentResult>(`/results/student-results/${id}/`);
  },

  create: async (data: {
    student_id: string;
    subject_id: string;
    session_id: string;
    first_summative_full?: number;
    first_summative_obtained?: number;
    first_formative_full?: number;
    first_formative_obtained?: number;
    second_summative_full?: number;
    second_summative_obtained?: number;
    second_formative_full?: number;
    second_formative_obtained?: number;
    third_summative_full?: number;
    third_summative_obtained?: number;
    third_formative_full?: number;
    third_formative_obtained?: number;
    conduct?: string;
    attendance_days?: number;
  }): Promise<StudentResult> => {
    return api.post<StudentResult>('/results/student-results/', data);
  },

  update: async (id: string, data: Partial<StudentResult>): Promise<StudentResult> => {
    return api.patch<StudentResult>(`/results/student-results/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/results/student-results/${id}/`);
  },

  upsert: async (data: {
    student_id: string;
    subject_id: string;
    session_id: string;
    first_summative_full?: number;
    first_summative_obtained?: number;
    first_formative_full?: number;
    first_formative_obtained?: number;
    second_summative_full?: number;
    second_summative_obtained?: number;
    second_formative_full?: number;
    second_formative_obtained?: number;
    third_summative_full?: number;
    third_summative_obtained?: number;
    third_formative_full?: number;
    third_formative_obtained?: number;
    conduct?: string;
    attendance_days?: number;
  }): Promise<StudentResult> => {
    return api.post<StudentResult>('/results/student-results/upsert/', data);
  },

  bulkUpsert: async (results: Array<{
    student_id: string;
    subject_id: string;
    session_id: string;
    first_summative_full?: number;
    first_summative_obtained?: number;
    first_formative_full?: number;
    first_formative_obtained?: number;
    second_summative_full?: number;
    second_summative_obtained?: number;
    second_formative_full?: number;
    second_formative_obtained?: number;
    third_summative_full?: number;
    third_summative_obtained?: number;
    third_formative_full?: number;
    third_formative_obtained?: number;
    conduct?: string;
    attendance_days?: number;
  }>): Promise<StudentResult[]> => {
    return api.post<StudentResult[]>('/results/student-results/bulk-upsert/', { results });
  },

  getByClassSection: async (params: {
    session_id: string;
    class_id: string;
    section_id: string;
    subject_id: string;
  }): Promise<StudentWithResult[]> => {
    return api.get<StudentWithResult[]>('/results/student-results/by-class-section/', params);
  },

  getByStudents: async (studentIds: string[], sessionId?: string): Promise<StudentResult[]> => {
    return api.post<StudentResult[]>('/results/student-results/by-students/', {
      student_ids: studentIds,
      session_id: sessionId,
    });
  },

  // Get results for the currently logged-in student
  getMyResults: async (params?: { session_id?: string; exam_type_id?: string }): Promise<StudentResult[]> => {
    return api.get<StudentResult[]>('/results/student-results/my-results/', params);
  },
};

// Cocurricular Results API
export const cocurricularResultsApi = {
  getAll: async (params?: {
    student_id?: string;
    session_id?: string;
    page?: number;
  }): Promise<PaginatedResponse<StudentCocurricularResult>> => {
    return api.get<PaginatedResponse<StudentCocurricularResult>>('/results/cocurricular-results/', params);
  },

  getAllUnpaginated: async (params?: {
    student_id?: string;
    session_id?: string;
  }): Promise<StudentCocurricularResult[]> => {
    const response = await api.get<{ results?: StudentCocurricularResult[] } | StudentCocurricularResult[]>(
      '/results/cocurricular-results/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<StudentCocurricularResult> => {
    return api.get<StudentCocurricularResult>(`/results/cocurricular-results/${id}/`);
  },

  create: async (data: {
    student_id: string;
    cocurricular_subject_id: string;
    session_id: string;
    first_term_marks?: number;
    second_term_marks?: number;
    final_term_marks?: number;
    full_marks?: number;
    first_term_grade?: string;
    second_term_grade?: string;
    final_term_grade?: string;
    overall_grade?: string;
  }): Promise<StudentCocurricularResult> => {
    return api.post<StudentCocurricularResult>('/results/cocurricular-results/', data);
  },

  update: async (id: string, data: Partial<StudentCocurricularResult>): Promise<StudentCocurricularResult> => {
    return api.patch<StudentCocurricularResult>(`/results/cocurricular-results/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/results/cocurricular-results/${id}/`);
  },

  upsert: async (data: {
    student_id: string;
    cocurricular_subject_id: string;
    session_id: string;
    first_term_marks?: number;
    second_term_marks?: number;
    final_term_marks?: number;
    full_marks?: number;
    first_term_grade?: string;
    second_term_grade?: string;
    final_term_grade?: string;
    overall_grade?: string;
  }): Promise<StudentCocurricularResult> => {
    return api.post<StudentCocurricularResult>('/results/cocurricular-results/upsert/', data);
  },

  bulkUpsert: async (results: Array<{
    student_id: string;
    cocurricular_subject_id: string;
    session_id: string;
    first_term_marks?: number;
    second_term_marks?: number;
    final_term_marks?: number;
    full_marks?: number;
    first_term_grade?: string;
    second_term_grade?: string;
    final_term_grade?: string;
    overall_grade?: string;
  }>): Promise<StudentCocurricularResult[]> => {
    return api.post<StudentCocurricularResult[]>('/results/cocurricular-results/bulk-upsert/', { results });
  },

  getByClassSection: async (params: {
    session_id: string;
    class_id: string;
    section_id: string;
    cocurricular_subject_id: string;
  }): Promise<StudentWithResult[]> => {
    return api.get<StudentWithResult[]>('/results/cocurricular-results/by-class-section/', params);
  },
};

// Optional Results API
export const optionalResultsApi = {
  getAll: async (params?: {
    student_id?: string;
    session_id?: string;
    page?: number;
  }): Promise<PaginatedResponse<StudentOptionalResult>> => {
    return api.get<PaginatedResponse<StudentOptionalResult>>('/results/optional-results/', params);
  },

  getAllUnpaginated: async (params?: {
    student_id?: string;
    session_id?: string;
  }): Promise<StudentOptionalResult[]> => {
    const response = await api.get<{ results?: StudentOptionalResult[] } | StudentOptionalResult[]>(
      '/results/optional-results/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<StudentOptionalResult> => {
    return api.get<StudentOptionalResult>(`/results/optional-results/${id}/`);
  },

  create: async (data: {
    student_id: string;
    optional_subject_id: string;
    session_id: string;
    obtained_marks?: number;
    full_marks?: number;
    grade?: string;
  }): Promise<StudentOptionalResult> => {
    return api.post<StudentOptionalResult>('/results/optional-results/', data);
  },

  update: async (id: string, data: Partial<StudentOptionalResult>): Promise<StudentOptionalResult> => {
    return api.patch<StudentOptionalResult>(`/results/optional-results/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/results/optional-results/${id}/`);
  },

  upsert: async (data: {
    student_id: string;
    optional_subject_id: string;
    session_id: string;
    obtained_marks?: number;
    full_marks?: number;
    grade?: string;
  }): Promise<StudentOptionalResult> => {
    return api.post<StudentOptionalResult>('/results/optional-results/upsert/', data);
  },

  bulkUpsert: async (results: Array<{
    student_id: string;
    optional_subject_id: string;
    session_id: string;
    obtained_marks?: number;
    full_marks?: number;
    grade?: string;
  }>): Promise<StudentOptionalResult[]> => {
    return api.post<StudentOptionalResult[]>('/results/optional-results/bulk-upsert/', { results });
  },
};

// Marksheet API
export const marksheetApi = {
  getByStudent: async (studentId: string, sessionId?: string): Promise<StudentMarksheet> => {
    return api.get<StudentMarksheet>(`/results/marksheet/${studentId}/`, { session_id: sessionId });
  },

  generate: async (params: { student_id: string; exam_type_id: string; session_id: string }): Promise<MarksheetResponse> => {
    return api.post<MarksheetResponse>('/results/marksheet/generate/', params);
  },

  generateBulk: async (
    sessionId: string,
    classId: string,
    sectionId?: string
  ): Promise<MarksheetResponse[]> => {
    return api.post<MarksheetResponse[]>('/results/marksheet/generate-bulk/', {
      session_id: sessionId,
      class_id: classId,
      section_id: sectionId,
    });
  },

  downloadPdf: async (params: { student_id: string; exam_type_id: string; session_id: string }): Promise<Blob> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/results/marksheet/${params.student_id}/pdf/?session_id=${params.session_id}&exam_type_id=${params.exam_type_id}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    
    return response.blob();
  },
};

// Exam Types API
export const examTypesApi = {
  getAll: async (): Promise<ExamType[]> => {
    return api.get('/results/exam-types/');
  },

  getById: async (id: string): Promise<ExamType> => {
    return api.get(`/results/exam-types/${id}/`);
  },
};

// Subject Marks API
export const marksApi = {
  getAll: async (params?: {
    student_id?: string;
    subject_id?: string;
    exam_type_id?: string;
    session_id?: string;
    class_id?: string;
    section_id?: string;
  }): Promise<SubjectMark[]> => {
    const response = await api.get<{ results?: SubjectMark[] } | SubjectMark[]>('/results/subject-marks/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: Partial<SubjectMark>): Promise<SubjectMark> => {
    return api.post('/results/subject-marks/', data);
  },

  update: async (id: string, data: Partial<SubjectMark>): Promise<SubjectMark> => {
    return api.patch(`/results/subject-marks/${id}/`, data);
  },
};

// Cocurricular API (simplified for teacher entry)
export const cocurricularApi = {
  getAll: async (params?: {
    student_id?: string;
    session_id?: string;
    class_id?: string;
    section_id?: string;
  }): Promise<CocurricularGrade[]> => {
    const response = await api.get<{ results?: CocurricularGrade[] } | CocurricularGrade[]>('/results/cocurricular-grades/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  create: async (data: Partial<CocurricularGrade>): Promise<CocurricularGrade> => {
    return api.post('/results/cocurricular-grades/', data);
  },

  update: async (id: string, data: Partial<CocurricularGrade>): Promise<CocurricularGrade> => {
    return api.patch(`/results/cocurricular-grades/${id}/`, data);
  },
};

// Teacher Subject Assignments API
export const teacherSubjectAssignmentsApi = {
  getMyAssignments: async (params?: { session_id?: string }): Promise<SubjectAssignment[]> => {
    const response = await api.get<{ results?: SubjectAssignment[] } | SubjectAssignment[]>('/results/teacher-assignments/my/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  getAll: async (params?: { teacher_id?: string; session_id?: string }): Promise<SubjectAssignment[]> => {
    const response = await api.get<{ results?: SubjectAssignment[] } | SubjectAssignment[]>('/results/teacher-assignments/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },
};
