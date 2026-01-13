import React, { useState, useEffect, createContext, useContext } from 'react';
import { studentPortalApi } from '../lib/coreApi';
import type { Student, StudentFeesSummary, Payment } from '../lib/types';

// ============================================================================
// Student Auth Context
// ============================================================================

interface StudentAuthContextType {
  student: Student | null;
  loading: boolean;
  login: (studentId: string, password: string) => Promise<void>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | null>(null);

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentPaymentPortal');
  }
  return context;
};

// ============================================================================
// Student Login Component
// ============================================================================

interface StudentLoginProps {
  onLogin: (studentId: string, password: string) => Promise<void>;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLogin }) => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onLogin(studentId, password);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Student Payment Portal</h1>
            <p className="text-gray-600 mt-2">Login to view your fees and make payments</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="text"
                id="studentId"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your Student ID"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter your password (DOB: DDMMYYYY)"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Default password is your date of birth in DDMMYYYY format</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Fee Card Component
// ============================================================================

interface FeeCardProps {
  title: string;
  amount: string;
  subtitle?: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
  icon: React.ReactNode;
}

const FeeCard: React.FC<FeeCardProps> = ({ title, amount, subtitle, color, icon }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  };

  return (
    <div className={`rounded-xl border-2 p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">₹{amount}</div>
      {subtitle && <div className="text-sm opacity-70 mt-1">{subtitle}</div>}
    </div>
  );
};

// ============================================================================
// Payment History Component
// ============================================================================

interface PaymentHistoryProps {
  payments: Payment[];
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ payments }) => {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No payment history available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <div key={payment.id} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">₹{payment.amount}</div>
            <div className="text-sm text-gray-500">
              {new Date(payment.payment_date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-gray-700 capitalize">{payment.payment_method.replace('_', ' ')}</div>
            <div className="text-xs text-gray-500">{payment.receipt_number}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Student Dashboard Component
// ============================================================================

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onLogout }) => {
  const [feesData, setFeesData] = useState<StudentFeesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const data = await studentPortalApi.getFees();
        setFeesData(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load fee information');
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your fee information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-bold">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{student.name}</div>
                <div className="text-sm text-gray-500">ID: {student.student_id}</div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {feesData && (
          <>
            {/* Fee Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <FeeCard
                title="Total Fees"
                amount={feesData.summary.total_net}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                }
              />
              <FeeCard
                title="Amount Paid"
                amount={feesData.summary.total_paid}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <FeeCard
                title="Balance Due"
                amount={feesData.summary.balance}
                subtitle={parseFloat(feesData.summary.balance) > 0 ? 'Payment pending' : 'All cleared'}
                color={parseFloat(feesData.summary.balance) > 0 ? 'red' : 'green'}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <FeeCard
                title="Discount Applied"
                amount={feesData.summary.total_discount}
                color="yellow"
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
              />
            </div>

            {/* Fee Details & Payment History */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Fee Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Breakdown</h2>
                <div className="space-y-3">
                  {feesData.fees.map((fee) => (
                    <div key={fee.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-medium text-gray-900">{fee.fee_structure?.name || 'Fee'}</div>
                        <div className="text-sm text-gray-500">
                          Due: {fee.due_date ? new Date(fee.due_date).toLocaleDateString('en-IN') : 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">₹{fee.net_amount}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          fee.status === 'paid' ? 'bg-green-100 text-green-700' :
                          fee.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                          fee.status === 'overdue' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payments</h2>
                <PaymentHistory payments={feesData.payments} />
              </div>
            </div>

            {/* Payment Button (placeholder for actual payment integration) */}
            {parseFloat(feesData.summary.balance) > 0 && (
              <div className="mt-8 text-center">
                <button className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors inline-flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Pay Now
                </button>
                <p className="text-sm text-gray-500 mt-2">Secure payment powered by your school's payment gateway</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// ============================================================================
// Main Student Payment Portal Component
// ============================================================================

const StudentPaymentPortal: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('student_token');
    if (token) {
      // Verify token and get student profile
      studentPortalApi.getProfile()
        .then((data) => {
          setStudent(data.student);
        })
        .catch(() => {
          localStorage.removeItem('student_token');
          localStorage.removeItem('student_refresh_token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = async (studentId: string, password: string) => {
    const response = await studentPortalApi.login(studentId, password);
    localStorage.setItem('student_token', response.access);
    localStorage.setItem('student_refresh_token', response.refresh);
    setStudent(response.student);
  };

  const handleLogout = () => {
    localStorage.removeItem('student_token');
    localStorage.removeItem('student_refresh_token');
    setStudent(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!student) {
    return <StudentLogin onLogin={handleLogin} />;
  }

  return <StudentDashboard student={student} onLogout={handleLogout} />;
};

export default StudentPaymentPortal;
