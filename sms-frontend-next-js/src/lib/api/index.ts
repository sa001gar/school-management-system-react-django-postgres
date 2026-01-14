/**
 * API Module Exports
 */

// Client
export { default as api, API_BASE_URL, getAccessToken, getRefreshToken, setTokens, clearTokens, isTokenExpired } from './client';

// Auth
export { authApi, teacherApi, AuthError } from './auth';

// Core
export {
  sessionsApi,
  classesApi,
  sectionsApi,
  subjectsApi,
  cocurricularSubjectsApi,
  optionalSubjectsApi,
  classSubjectAssignmentsApi,
  classOptionalConfigApi,
  classOptionalAssignmentsApi,
  classCocurricularConfigApi,
  classMarksDistributionApi,
  schoolConfigApi,
  studentsApi,
  studentEnrollmentsApi,
  teacherAssignmentsApi,
  classTeachersApi,
} from './core';

// Results
export {
  studentResultsApi,
  cocurricularResultsApi,
  optionalResultsApi,
  marksheetApi,
} from './results';

// Payments
export {
  feeStructuresApi,
  feeDiscountsApi,
  studentFeesApi,
  paymentsApi,
  paymentRemindersApi,
} from './payments';
