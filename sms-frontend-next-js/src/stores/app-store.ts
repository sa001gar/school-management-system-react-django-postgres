/**
 * App Store - Zustand
 * Manages global app state like sessions, classes, etc.
 */
import { create } from 'zustand';
import type { Session, Class, Section, Subject, CocurricularSubject, OptionalSubject } from '@/types';
import { sessionsApi, classesApi, sectionsApi, subjectsApi, cocurricularSubjectsApi, optionalSubjectsApi } from '@/lib/api';

interface AppState {
  // Data
  sessions: Session[];
  activeSession: Session | null;
  classes: Class[];
  sections: Section[];
  subjects: Subject[];
  cocurricularSubjects: CocurricularSubject[];
  optionalSubjects: OptionalSubject[];
  
  // Loading states
  isLoadingSessions: boolean;
  isLoadingClasses: boolean;
  isLoadingSections: boolean;
  isLoadingSubjects: boolean;
  
  // Selected filters
  selectedSessionId: string | null;
  selectedClassId: string | null;
  selectedSectionId: string | null;
  
  // Actions
  fetchSessions: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  fetchSections: (classId?: string) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchCocurricularSubjects: () => Promise<void>;
  fetchOptionalSubjects: () => Promise<void>;
  fetchInitialData: () => Promise<void>;
  
  // Setters
  setSelectedSession: (sessionId: string | null) => void;
  setSelectedClass: (classId: string | null) => void;
  setSelectedSection: (sectionId: string | null) => void;
  
  // Helpers
  getClassById: (id: string) => Class | undefined;
  getSectionById: (id: string) => Section | undefined;
  getSubjectById: (id: string) => Subject | undefined;
  getSessionById: (id: string) => Session | undefined;
}

export const useAppStore = create<AppState>()((set, get) => ({
  // Initial state
  sessions: [],
  activeSession: null,
  classes: [],
  sections: [],
  subjects: [],
  cocurricularSubjects: [],
  optionalSubjects: [],
  
  isLoadingSessions: false,
  isLoadingClasses: false,
  isLoadingSections: false,
  isLoadingSubjects: false,
  
  selectedSessionId: null,
  selectedClassId: null,
  selectedSectionId: null,
  
  // Fetch sessions
  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const sessions = await sessionsApi.getAll();
      const activeSession = sessions.find(s => s.is_active) || null;
      set({ 
        sessions, 
        activeSession,
        selectedSessionId: activeSession?.id || null,
        isLoadingSessions: false 
      });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      set({ isLoadingSessions: false });
    }
  },
  
  // Fetch classes
  fetchClasses: async () => {
    set({ isLoadingClasses: true });
    try {
      const classes = await classesApi.getAll();
      set({ classes, isLoadingClasses: false });
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      set({ isLoadingClasses: false });
    }
  },
  
  // Fetch sections
  fetchSections: async (classId?: string) => {
    set({ isLoadingSections: true });
    try {
      const sections = await sectionsApi.getAll(classId);
      set({ sections, isLoadingSections: false });
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      set({ isLoadingSections: false });
    }
  },
  
  // Fetch subjects
  fetchSubjects: async () => {
    set({ isLoadingSubjects: true });
    try {
      const subjects = await subjectsApi.getAll();
      set({ subjects, isLoadingSubjects: false });
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      set({ isLoadingSubjects: false });
    }
  },
  
  // Fetch cocurricular subjects
  fetchCocurricularSubjects: async () => {
    try {
      const cocurricularSubjects = await cocurricularSubjectsApi.getAll();
      set({ cocurricularSubjects });
    } catch (error) {
      console.error('Failed to fetch cocurricular subjects:', error);
    }
  },
  
  // Fetch optional subjects
  fetchOptionalSubjects: async () => {
    try {
      const optionalSubjects = await optionalSubjectsApi.getAll();
      set({ optionalSubjects });
    } catch (error) {
      console.error('Failed to fetch optional subjects:', error);
    }
  },
  
  // Fetch all initial data
  fetchInitialData: async () => {
    await Promise.all([
      get().fetchSessions(),
      get().fetchClasses(),
      get().fetchSubjects(),
      get().fetchCocurricularSubjects(),
      get().fetchOptionalSubjects(),
    ]);
  },
  
  // Setters
  setSelectedSession: (sessionId) => set({ selectedSessionId: sessionId }),
  setSelectedClass: (classId) => {
    set({ selectedClassId: classId, selectedSectionId: null });
    if (classId) {
      get().fetchSections(classId);
    } else {
      set({ sections: [] });
    }
  },
  setSelectedSection: (sectionId) => set({ selectedSectionId: sectionId }),
  
  // Helpers
  getClassById: (id) => get().classes.find(c => c.id === id),
  getSectionById: (id) => get().sections.find(s => s.id === id),
  getSubjectById: (id) => get().subjects.find(s => s.id === id),
  getSessionById: (id) => get().sessions.find(s => s.id === id),
}));

// Selector hooks
export const useSessions = () => useAppStore((state) => state.sessions);
export const useActiveSession = () => useAppStore((state) => state.activeSession);
export const useClasses = () => useAppStore((state) => state.classes);
export const useSections = () => useAppStore((state) => state.sections);
export const useSubjects = () => useAppStore((state) => state.subjects);
export const useCocurricularSubjects = () => useAppStore((state) => state.cocurricularSubjects);
export const useOptionalSubjects = () => useAppStore((state) => state.optionalSubjects);
