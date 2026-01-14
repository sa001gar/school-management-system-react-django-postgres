/**
 * React Query Hooks
 * Custom hooks for data fetching with TanStack Query
 */
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  sessionsApi,
  classesApi,
  sectionsApi,
  subjectsApi,
  studentsApi,
  teacherApi,
  studentResultsApi,
  cocurricularResultsApi,
  optionalResultsApi,
  marksheetApi,
  studentFeesApi,
  paymentsApi,
  feeStructuresApi,
} from '@/lib/api';
import type {
  Session,
  Class,
  Section,
  Subject,
  Student,
  Teacher,
  StudentResult,
  StudentFee,
  Payment,
  FeeStructure,
  PaginatedResponse,
  ClassConfigResponse,
  StudentMarksheet,
} from '@/types';

// Query Keys
export const queryKeys = {
  sessions: ['sessions'] as const,
  session: (id: string) => ['sessions', id] as const,
  classes: ['classes'] as const,
  class: (id: string) => ['classes', id] as const,
  classConfig: (id: string) => ['classes', id, 'config'] as const,
  sections: (classId?: string) => ['sections', { classId }] as const,
  subjects: ['subjects'] as const,
  students: (filters?: Record<string, unknown>) => ['students', filters] as const,
  student: (id: string) => ['students', id] as const,
  teachers: ['teachers'] as const,
  teacher: (id: string) => ['teachers', id] as const,
  results: (filters?: Record<string, unknown>) => ['results', filters] as const,
  resultsByClassSection: (params: { session_id: string; class_id: string; section_id: string; subject_id: string }) =>
    ['results', 'by-class-section', params] as const,
  marksheet: (studentId: string, sessionId?: string) => ['marksheet', studentId, sessionId] as const,
  studentFees: (filters?: Record<string, unknown>) => ['student-fees', filters] as const,
  payments: (filters?: Record<string, unknown>) => ['payments', filters] as const,
  feeStructures: (filters?: Record<string, unknown>) => ['fee-structures', filters] as const,
};

// Sessions
export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: sessionsApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: [...queryKeys.sessions, 'active'],
    queryFn: sessionsApi.getActive,
    staleTime: 5 * 60 * 1000,
  });
}

// Classes
export function useClasses() {
  return useQuery({
    queryKey: queryKeys.classes,
    queryFn: classesApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClassConfig(classId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.classConfig(classId!),
    queryFn: () => classesApi.getConfig(classId!),
    enabled: !!classId,
    staleTime: 2 * 60 * 1000,
  });
}

// Sections
export function useSections(classId?: string) {
  return useQuery({
    queryKey: queryKeys.sections(classId),
    queryFn: () => sectionsApi.getAll(classId),
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  });
}

// Subjects
export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects,
    queryFn: subjectsApi.getAll,
    staleTime: 10 * 60 * 1000,
  });
}

// Students
export function useStudents(filters?: {
  class_id?: string;
  section_id?: string;
  session_id?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: queryKeys.students(filters),
    queryFn: () => studentsApi.getAll(filters),
    staleTime: 30 * 1000,
  });
}

export function useStudentsByFilters(sessionId: string, classId: string, sectionId: string) {
  return useQuery({
    queryKey: queryKeys.students({ sessionId, classId, sectionId }),
    queryFn: () => studentsApi.getByFilters(sessionId, classId, sectionId),
    enabled: !!sessionId && !!classId && !!sectionId,
    staleTime: 30 * 1000,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: queryKeys.student(id),
    queryFn: () => studentsApi.getById(id),
    enabled: !!id,
  });
}

// Teachers
export function useTeachers() {
  return useQuery({
    queryKey: queryKeys.teachers,
    queryFn: teacherApi.getAll,
    staleTime: 5 * 60 * 1000,
  });
}

// Results
export function useResultsByClassSection(params: {
  session_id: string;
  class_id: string;
  section_id: string;
  subject_id: string;
}) {
  return useQuery({
    queryKey: queryKeys.resultsByClassSection(params),
    queryFn: () => studentResultsApi.getByClassSection(params),
    enabled: !!params.session_id && !!params.class_id && !!params.section_id && !!params.subject_id,
    staleTime: 30 * 1000,
  });
}

// Marksheet
export function useMarksheet(studentId: string, sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.marksheet(studentId, sessionId),
    queryFn: () => marksheetApi.getByStudent(studentId, sessionId),
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });
}

// Fees
export function useStudentFees(filters?: {
  student_id?: string;
  session_id?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: queryKeys.studentFees(filters),
    queryFn: () => studentFeesApi.getAll(filters),
    staleTime: 30 * 1000,
  });
}

export function useFeeStructures(filters?: {
  class_id?: string;
  session_id?: string;
}) {
  return useQuery({
    queryKey: queryKeys.feeStructures(filters),
    queryFn: () => feeStructuresApi.getAll(filters),
    staleTime: 5 * 60 * 1000,
  });
}

// Mutations
export function useCreateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => 
      studentsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.student(variables.id) });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useBulkUpsertResults() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: studentResultsApi.bulkUpsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: paymentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
    },
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teacherApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: teacherApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers });
    },
  });
}
