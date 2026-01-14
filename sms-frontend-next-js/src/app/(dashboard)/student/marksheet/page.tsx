/**
 * Student - Marksheet Page
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi } from '@/lib/api';
import { studentResultsApi, examTypesApi, marksheetApi } from '@/lib/api/results';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export default function StudentMarksheetPage() {
  const { user } = useAuthStore();
  const [selectedExamType, setSelectedExamType] = useState('');

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: examTypesApi.getAll,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['my-results', activeSession?.id],
    queryFn: () => studentResultsApi.getMyResults({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const handleDownload = async (examTypeId: string, examTypeName: string) => {
    try {
      const response = await marksheetApi.downloadPdf({
        student_id: user?.id!,
        exam_type_id: examTypeId,
        session_id: activeSession?.id!,
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marksheet_${examTypeName}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Marksheet downloaded successfully');
    } catch (error) {
      toast.error('Failed to download marksheet');
    }
  };

  const examTypeOptions: SelectOption[] = (examTypes || []).map(e => ({ value: e.id, label: e.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Download Marksheet"
        description="Download your examination marksheets"
        icon={GraduationCap}
      />

      <Card>
        <CardHeader>
          <CardTitle>Available Marksheets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !results?.length ? (
            <EmptyState
              icon={GraduationCap}
              title="No marksheets available"
              description="Your marksheets will appear here once results are published"
            />
          ) : (
            <div className="space-y-4">
              {results.map((result: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold text-gray-900">{result.exam_type}</h4>
                    <p className="text-sm text-gray-500">
                      Session: {result.session} • Grade: {result.overall_grade} • {result.percentage?.toFixed(1)}%
                    </p>
                  </div>
                  <Button
                    onClick={() => handleDownload(result.exam_type_id, result.exam_type)}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Select the examination for which you want to download the marksheet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Click the Download button to save the marksheet as PDF
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Marksheets are available only after results are published
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              For any discrepancies, please contact your class teacher
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
