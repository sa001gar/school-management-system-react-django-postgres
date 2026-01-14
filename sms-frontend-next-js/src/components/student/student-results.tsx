/**
 * Student Results View Component
 */
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, TableSkeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi } from '@/lib/api';
import { studentResultsApi, examTypesApi, marksheetApi } from '@/lib/api/results';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function StudentResults() {
  const { user } = useAuthStore();
  const [selectedSession, setSelectedSession] = useState('');
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
    queryKey: ['my-results', selectedSession || activeSession?.id, selectedExamType],
    queryFn: () => studentResultsApi.getMyResults({
      session_id: selectedSession || activeSession?.id,
      exam_type_id: selectedExamType || undefined,
    }),
    enabled: !!(selectedSession || activeSession?.id),
  });

  const handleDownloadMarksheet = async (result: any) => {
    try {
      const response = await marksheetApi.downloadPdf({
        student_id: user?.id!,
        exam_type_id: result.exam_type_id,
        session_id: result.session_id,
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marksheet_${result.exam_type}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Marksheet downloaded');
    } catch (error) {
      toast.error('Failed to download marksheet');
    }
  };

  const sessionOptions: SelectOption[] = (sessions || []).map(s => ({ value: s.id, label: s.name }));
  const examTypeOptions: SelectOption[] = (examTypes || []).map(e => ({ value: e.id, label: e.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Results"
        description="View your examination results"
        icon={FileText}
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            <Select
              label="Session"
              options={sessionOptions}
              value={selectedSession || activeSession?.id || ''}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-48"
            />
            <Select
              label="Exam Type"
              options={[{ value: '', label: 'All Exams' }, ...examTypeOptions]}
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={5} columns={6} />
          ) : !results?.length ? (
            <EmptyState
              icon={FileText}
              title="No results found"
              description="Your examination results will appear here once available"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                  <TableHead className="text-center">Percentage</TableHead>
                  <TableHead className="text-center">Grade</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.exam_type}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {result.session}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {result.total_marks} / {result.max_marks}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {result.percentage?.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{result.overall_grade}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={result.is_passed ? 'success' : 'danger'}>
                        {result.is_passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadMarksheet(result)}
                        leftIcon={<Download className="h-4 w-4" />}
                      >
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Subject-wise Breakdown */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {results[0]?.subjects ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Theory</TableHead>
                    <TableHead className="text-center">Practical</TableHead>
                    <TableHead className="text-center">Assignment</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results[0].subjects.map((subject, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-center">{subject.obtained ?? '-'}</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center">-</TableCell>
                      <TableCell className="text-center font-semibold">{subject.obtained ?? '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{subject.grade}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-gray-500 text-center py-4">Subject details not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
