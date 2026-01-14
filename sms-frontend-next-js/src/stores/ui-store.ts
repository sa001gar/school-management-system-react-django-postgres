/**
 * UI Store - Zustand
 * Manages UI state like sidebars, modals, etc.
 */
import { create } from 'zustand';

interface ModalState {
  isOpen: boolean;
  title?: string;
  data?: unknown;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Mobile menu
  mobileMenuOpen: boolean;
  
  // Modals
  modals: Record<string, ModalState>;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Modal actions
  openModal: (id: string, title?: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  getModal: (id: string) => ModalState;
  
  // Theme
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()((set, get) => ({
  // Initial state
  sidebarOpen: true,
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  modals: {},
  theme: 'light',
  
  // Sidebar actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  
  // Mobile menu actions
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  
  // Modal actions
  openModal: (id, title, data) => set((state) => ({
    modals: {
      ...state.modals,
      [id]: { isOpen: true, title, data },
    },
  })),
  closeModal: (id) => set((state) => ({
    modals: {
      ...state.modals,
      [id]: { ...state.modals[id], isOpen: false },
    },
  })),
  getModal: (id) => get().modals[id] || { isOpen: false },
  
  // Theme
  setTheme: (theme) => set({ theme }),
}));

// Modal hook for convenience
export function useModal(id: string) {
  const modal = useUIStore((state) => state.modals[id] || { isOpen: false });
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  return {
    isOpen: modal.isOpen,
    title: modal.title,
    data: modal.data,
    open: (title?: string, data?: unknown) => openModal(id, title, data),
    close: () => closeModal(id),
  };
}
