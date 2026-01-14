/**
 * Payments API Service
 * API functions for payment management
 */
import api from './client';
import type {
  FeeStructure,
  FeeDiscount,
  StudentFee,
  Payment,
  PaymentReminder,
  FeeSummary,
  DailyCollection,
  PaginatedResponse,
  StudentFeesSummary,
} from '@/types';

// Fee Structures API
export const feeStructuresApi = {
  getAll: async (params?: {
    class_id?: string;
    session_id?: string;
    is_active?: boolean;
  }): Promise<FeeStructure[]> => {
    const response = await api.get<{ results?: FeeStructure[] } | FeeStructure[]>(
      '/payments/fee-structures/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<FeeStructure> => {
    return api.get<FeeStructure>(`/payments/fee-structures/${id}/`);
  },

  create: async (data: {
    name: string;
    description?: string;
    class_id: string;
    session_id: string;
    tuition_fee?: number;
    admission_fee?: number;
    library_fee?: number;
    lab_fee?: number;
    sports_fee?: number;
    exam_fee?: number;
    miscellaneous_fee?: number;
    is_active?: boolean;
  }): Promise<FeeStructure> => {
    return api.post<FeeStructure>('/payments/fee-structures/', data);
  },

  update: async (id: string, data: Partial<FeeStructure>): Promise<FeeStructure> => {
    return api.patch<FeeStructure>(`/payments/fee-structures/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/payments/fee-structures/${id}/`);
  },
};

// Fee Discounts API
export const feeDiscountsApi = {
  getAll: async (params?: {
    is_active?: boolean;
  }): Promise<FeeDiscount[]> => {
    const response = await api.get<{ results?: FeeDiscount[] } | FeeDiscount[]>(
      '/payments/fee-discounts/',
      params
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getById: async (id: string): Promise<FeeDiscount> => {
    return api.get<FeeDiscount>(`/payments/fee-discounts/${id}/`);
  },

  create: async (data: {
    name: string;
    description?: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    is_active?: boolean;
  }): Promise<FeeDiscount> => {
    return api.post<FeeDiscount>('/payments/fee-discounts/', data);
  },

  update: async (id: string, data: Partial<FeeDiscount>): Promise<FeeDiscount> => {
    return api.patch<FeeDiscount>(`/payments/fee-discounts/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/payments/fee-discounts/${id}/`);
  },
};

// Student Fees API
export const studentFeesApi = {
  getAll: async (params?: {
    student_id?: string;
    session_id?: string;
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<StudentFee>> => {
    return api.get<PaginatedResponse<StudentFee>>('/payments/student-fees/', params);
  },

  getById: async (id: string): Promise<StudentFee> => {
    return api.get<StudentFee>(`/payments/student-fees/${id}/`);
  },

  create: async (data: {
    student_id: string;
    fee_structure_id: string;
    session_id: string;
    discount_id?: string;
    due_date?: string;
  }): Promise<StudentFee> => {
    return api.post<StudentFee>('/payments/student-fees/', data);
  },

  update: async (id: string, data: Partial<StudentFee>): Promise<StudentFee> => {
    return api.patch<StudentFee>(`/payments/student-fees/${id}/`, data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/payments/student-fees/${id}/`);
  },

  getSummary: async (params?: {
    session_id?: string;
    class_id?: string;
  }): Promise<FeeSummary> => {
    return api.get<FeeSummary>('/payments/student-fees/summary/', params);
  },

  waive: async (id: string): Promise<StudentFee> => {
    return api.post<StudentFee>(`/payments/student-fees/${id}/waive/`);
  },

  getOverdue: async (): Promise<StudentFee[]> => {
    const response = await api.get<{ results?: StudentFee[] } | StudentFee[]>(
      '/payments/student-fees/overdue/'
    );
    return Array.isArray(response) ? response : (response.results || []);
  },

  getByStudent: async (studentId: string, sessionId?: string): Promise<StudentFeesSummary> => {
    return api.get<StudentFeesSummary>(`/payments/student-fees/by-student/${studentId}/`, {
      session_id: sessionId,
    });
  },

  getMyFees: async (params?: { session_id?: string }): Promise<StudentFeesSummary> => {
    return api.get<StudentFeesSummary>('/payments/student-fees/my/', params);
  },
};

// Payments API
export const paymentsApi = {
  getAll: async (params?: {
    student_fee_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
  }): Promise<PaginatedResponse<Payment>> => {
    return api.get<PaginatedResponse<Payment>>('/payments/payments/', params);
  },

  getById: async (id: string): Promise<Payment> => {
    return api.get<Payment>(`/payments/payments/${id}/`);
  },

  create: async (data: {
    student_fee_id: string;
    amount: number;
    payment_method: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'online' | 'other';
    transaction_id?: string;
    reference_number?: string;
    payment_date?: string;
    remarks?: string;
  }): Promise<Payment> => {
    return api.post<Payment>('/payments/payments/', data);
  },

  getDailyCollection: async (date?: string): Promise<DailyCollection> => {
    return api.get<DailyCollection>('/payments/payments/daily-collection/', { date });
  },

  getMyPayments: async (params?: { session_id?: string }): Promise<Payment[]> => {
    const response = await api.get<{ results?: Payment[] } | Payment[]>('/payments/payments/my/', params);
    return Array.isArray(response) ? response : (response.results || []);
  },

  getReceipt: async (id: string): Promise<Blob> => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/payments/payments/${id}/receipt/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to download receipt');
    }
    
    return response.blob();
  },
};

// Payment Reminders API
export const paymentRemindersApi = {
  getAll: async (params?: {
    student_fee_id?: string;
    status?: string;
    page?: number;
  }): Promise<PaginatedResponse<PaymentReminder>> => {
    return api.get<PaginatedResponse<PaymentReminder>>('/payments/payment-reminders/', params);
  },

  create: async (data: {
    student_fee_id: string;
    reminder_date: string;
    message: string;
  }): Promise<PaymentReminder> => {
    return api.post<PaymentReminder>('/payments/payment-reminders/', data);
  },

  cancel: async (id: string): Promise<PaymentReminder> => {
    return api.post<PaymentReminder>(`/payments/payment-reminders/${id}/cancel/`);
  },
};
