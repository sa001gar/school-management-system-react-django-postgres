/**
 * Student - Results Page
 */
import { StudentResults } from '@/components/student/student-results';

export const metadata = {
  title: 'My Results - Student Dashboard',
  description: 'View examination results',
};

export default function ResultsPage() {
  return <StudentResults />;
}
