/**
 * Marksheet Generation Component
 */
'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Printer, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi, classesApi, sectionsApi, studentsApi } from '@/lib/api';
import { marksheetApi, examTypesApi } from '@/lib/api/results';
import type { Student, Marksheet } from '@/types';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function MarksheetGeneration() {
  const marksheetRef = useRef<HTMLDivElement>(null);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', selectedClass],
    queryFn: () => sectionsApi.getByClass(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: examTypesApi.getAll,
  });

  const { data: students } = useQuery({
    queryKey: ['students', { session_id: activeSession?.id, class_id: selectedClass, section_id: selectedSection }],
    queryFn: () => studentsApi.getAll({
      session_id: activeSession?.id,
      class_id: selectedClass,
      section_id: selectedSection,
      page: 1,
    }),
    enabled: !!selectedClass && !!selectedSection && !!activeSession?.id,
  });

  const { data: marksheet, isLoading: loadingMarksheet, refetch: refetchMarksheet } = useQuery({
    queryKey: ['marksheet', selectedStudent, selectedExamType],
    queryFn: () => marksheetApi.generate({
      student_id: selectedStudent,
      exam_type_id: selectedExamType,
      session_id: activeSession?.id!,
    }),
    enabled: !!selectedStudent && !!selectedExamType && !!activeSession?.id,
  });

  const handlePreview = () => {
    if (!selectedStudent || !selectedExamType) {
      toast.error('Please select student and exam type');
      return;
    }
    refetchMarksheet();
    setShowPreview(true);
  };

  const handlePrint = () => {
    if (marksheetRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Marksheet - ${marksheet?.student_info?.name}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #333; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; }
                .header p { margin: 5px 0; }
                .student-info { display: flex; justify-content: space-between; margin-bottom: 20px; }
                .signature { margin-top: 50px; display: flex; justify-content: space-between; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>${marksheetRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = async () => {
    if (!marksheet) return;
    
    try {
      const response = await marksheetApi.downloadPdf({
        student_id: selectedStudent,
        exam_type_id: selectedExamType,
        session_id: activeSession?.id!,
      });
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marksheet_${marksheet.student_info?.name}_${marksheet.exam_type}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Marksheet downloaded');
    } catch (error) {
      toast.error('Failed to download marksheet');
    }
  };

  const sessionOptions: SelectOption[] = (sessions || []).map(s => ({ value: s.id, label: s.name }));
  const classOptions: SelectOption[] = (classes || []).map(c => ({ value: c.id, label: c.name }));
  const sectionOptions: SelectOption[] = (sections || []).map(s => ({ value: s.id, label: s.name }));
  const studentOptions: SelectOption[] = (students?.results || []).map((s: Student) => ({ 
    value: s.id, 
    label: `${s.roll_no} - ${s.name}` 
  }));
  const examTypeOptions: SelectOption[] = (examTypes || []).map(e => ({ value: e.id, label: e.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate Marksheet"
        description="Generate and print student marksheets"
        icon={FileText}
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              label="Class"
              options={classOptions}
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setSelectedStudent('');
              }}
              placeholder="Select class"
            />
            <Select
              label="Section"
              options={sectionOptions}
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedStudent('');
              }}
              placeholder="Select section"
              disabled={!selectedClass}
            />
            <Select
              label="Student"
              options={studentOptions}
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              placeholder="Select student"
              disabled={!selectedSection}
            />
            <Select
              label="Exam Type"
              options={examTypeOptions}
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              placeholder="Select exam"
            />
            <div className="flex items-end">
              <Button
                onClick={handlePreview}
                disabled={!selectedStudent || !selectedExamType}
                leftIcon={<Eye className="h-4 w-4" />}
                className="w-full"
              >
                Preview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marksheet Preview */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Marksheet Preview"
        size="xl"
      >
        {loadingMarksheet ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : marksheet ? (
          <div>
            <div ref={marksheetRef} className="p-6 bg-white">
              {/* School Header */}
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {marksheet.school_info?.name || 'School Name'}
                </h1>
                <p className="text-gray-600">{marksheet.school_info?.address}</p>
                <h2 className="text-lg font-semibold mt-2">{marksheet.exam_type} Examination</h2>
                <p className="text-sm text-gray-500">{marksheet.session?.name}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b">
                <div>
                  <p><strong>Name:</strong> {marksheet.student_info?.name}</p>
                  <p><strong>Roll No:</strong> {marksheet.student_info?.roll_no}</p>
                </div>
                <div>
                  <p><strong>Class:</strong> {marksheet.class_info?.name}</p>
                  <p><strong>Section:</strong> {marksheet.section_info?.name}</p>
                </div>
              </div>

              {/* Marks Table */}
              <table className="w-full mt-4 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Subject</th>
                    <th className="border p-2 text-center">Theory</th>
                    <th className="border p-2 text-center">Practical</th>
                    <th className="border p-2 text-center">Assignment</th>
                    <th className="border p-2 text-center">Total</th>
                    <th className="border p-2 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {marksheet.subjects?.map((subject, index) => (
                    <tr key={index}>
                      <td className="border p-2">{subject.name}</td>
                      <td className="border p-2 text-center">{subject.theory_marks ?? '-'}</td>
                      <td className="border p-2 text-center">{subject.practical_marks ?? '-'}</td>
                      <td className="border p-2 text-center">{subject.assignment_marks ?? '-'}</td>
                      <td className="border p-2 text-center font-semibold">{subject.total}</td>
                      <td className="border p-2 text-center">{subject.grade}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border p-2">Total / Percentage</td>
                    <td colSpan={3} className="border p-2 text-center">
                      {marksheet.total_marks} / {marksheet.max_marks}
                    </td>
                    <td className="border p-2 text-center">{marksheet.percentage?.toFixed(1)}%</td>
                    <td className="border p-2 text-center">{marksheet.overall_grade}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Co-curricular Grades */}
              {marksheet.cocurricular_grades && marksheet.cocurricular_grades.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Co-curricular Activities</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {marksheet.cocurricular_grades.map((grade, index) => (
                      <div key={index} className="flex justify-between border p-2">
                        <span>{grade.activity}</span>
                        <span className="font-semibold">{grade.grade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result & Remarks */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p><strong>Result:</strong> 
                    <span className={marksheet.is_passed ? 'text-green-600' : 'text-red-600'}>
                      {' '}{marksheet.is_passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </p>
                  <p><strong>Rank:</strong> {marksheet.rank || '-'}</p>
                </div>
                <div>
                  <p><strong>Remarks:</strong> {marksheet.remarks || '-'}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-12 flex justify-between text-center">
                <div>
                  <div className="w-32 border-t border-gray-400 mx-auto" />
                  <p className="text-sm mt-1">Class Teacher</p>
                </div>
                <div>
                  <div className="w-32 border-t border-gray-400 mx-auto" />
                  <p className="text-sm mt-1">Principal</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-4 p-4 border-t">
              <Button variant="outline" onClick={handlePrint} leftIcon={<Printer className="h-4 w-4" />}>
                Print
              </Button>
              <Button onClick={handleDownload} leftIcon={<Download className="h-4 w-4" />}>
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No marksheet data"
            description="Unable to generate marksheet for selected criteria"
          />
        )}
      </Modal>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Select the class, section, and student to generate their marksheet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Choose the exam type for which you want to generate the marksheet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Click Preview to view the marksheet before printing or downloading
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary-600">•</span>
              Use Print for direct printing or Download PDF to save a copy
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
