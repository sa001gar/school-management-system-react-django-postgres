/**
 * Teacher - Marksheet Generation Page
 */
import { MarksheetGeneration } from '@/components/teacher/marksheet-generation';

export const metadata = {
  title: 'Generate Marksheet - Teacher Dashboard',
  description: 'Generate and print student marksheets',
};

export default function MarksheetPage() {
  return <MarksheetGeneration />;
}
