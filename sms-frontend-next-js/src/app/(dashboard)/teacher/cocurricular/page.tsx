/**
 * Teacher - Co-curricular Entry Page
 */
import { CocurricularEntry } from '@/components/teacher/cocurricular-entry';

export const metadata = {
  title: 'Co-curricular Entry - Teacher Dashboard',
  description: 'Enter co-curricular grades',
};

export default function CocurricularPage() {
  return <CocurricularEntry />;
}
