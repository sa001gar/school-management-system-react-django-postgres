/**
 * Marks Entry Component for Teachers
 */
'use client';

import { useState, useOptimistic, useTransition, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton, TableSkeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi, classesApi, sectionsApi, subjectsApi, studentsApi } from '@/lib/api';
import { marksApi, examTypesApi, teacherSubjectAssignmentsApi } from '@/lib/api/results';
import type { Student, ExamType, SubjectMark } from '@/types';
import { toast } from 'sonner';

interface MarksState {
  [studentId: string]: {
    theory?: number;
    practical?: number;
    assignment?: number;
  };
}

export function MarksEntry() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  // Selection state
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  
  // Marks state
  const [marks, setMarks] = useState<MarksState>({});
  const [savedMarks, setSavedMarks] = useState<Set<string>>(new Set());

  // Optimistic marks update
  const [optimisticMarks, addOptimisticMark] = useOptimistic(
    marks,
    (state, update: { studentId: string; field: string; value: number }) => ({
      ...state,
      [update.studentId]: {
        ...state[update.studentId],
        [update.field]: update.value,
      },
    })
  );

  // Fetch data
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: assignments } = useQuery({
    queryKey: ['teacher-assignments', activeSession?.id],
    queryFn: () => teacherSubjectAssignmentsApi.getMyAssignments({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  // Get unique classes and subjects from assignments
  const assignedClasses = [...new Set(assignments?.map(a => a.class_id) || [])];
  const assignedSubjectsForClass = assignments?.filter(a => 
    a.class_id === selectedClass && 
    (!selectedSection || a.section_id === selectedSection)
  ) || [];

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });

  const assignedClassOptions = classesData?.filter(c => 
    assignedClasses.includes(c.id)
  ) || [];

  const { data: sections } = useQuery({
    queryKey: ['sections', selectedClass],
    queryFn: () => sectionsApi.getByClass(selectedClass),
    enabled: !!selectedClass,
  });

  const { data: examTypes } = useQuery({
    queryKey: ['exam-types'],
    queryFn: examTypesApi.getAll,
  });

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students', { session_id: activeSession?.id, class_id: selectedClass, section_id: selectedSection }],
    queryFn: () => studentsApi.getAll({
      session_id: activeSession?.id,
      class_id: selectedClass,
      section_id: selectedSection,
      page: 1,
    }),
    enabled: !!selectedClass && !!selectedSection,
  });

  // Fetch existing marks
  const { data: existingMarks, isLoading: loadingExistingMarks } = useQuery({
    queryKey: ['marks', { session_id: activeSession?.id, class_id: selectedClass, section_id: selectedSection, subject_id: selectedSubject, exam_type_id: selectedExamType }],
    queryFn: () => marksApi.getAll({
      session_id: activeSession?.id,
      class_id: selectedClass,
      section_id: selectedSection,
      subject_id: selectedSubject,
      exam_type_id: selectedExamType,
    }),
    enabled: !!selectedClass && !!selectedSection && !!selectedSubject && !!selectedExamType,
  });

  // Populate marks state when data loads
  useEffect(() => {
    if (existingMarks) {
      const marksState: MarksState = {};
      existingMarks?.forEach((mark: SubjectMark) => {
        marksState[mark.student_id] = {
          theory: mark.theory_marks,
          practical: mark.practical_marks,
          assignment: mark.assignment_marks,
        };
      });
      setMarks(marksState);
    }
  }, [existingMarks]);

  const saveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const studentMarks = marks[studentId];
      if (!studentMarks) return;

      const existingMark = existingMarks?.find((m: SubjectMark) => m.student_id === studentId);

      const data = {
        student_id: studentId,
        subject_id: selectedSubject,
        exam_type_id: selectedExamType,
        session_id: activeSession?.id,
        theory_marks: studentMarks.theory,
        practical_marks: studentMarks.practical,
        assignment_marks: studentMarks.assignment,
      };

      if (existingMark) {
        return marksApi.update(existingMark.id, data);
      } else {
        return marksApi.create(data);
      }
    },
    onSuccess: (_, studentId) => {
      setSavedMarks(prev => new Set(prev).add(studentId));
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success('Marks saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save marks');
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.keys(marks).map(studentId => {
        const studentMarks = marks[studentId];
        const existingMark = existingMarks?.find((m: SubjectMark) => m.student_id === studentId);

        const data = {
          student_id: studentId,
          subject_id: selectedSubject,
          exam_type_id: selectedExamType,
          session_id: activeSession?.id,
          theory_marks: studentMarks?.theory,
          practical_marks: studentMarks?.practical,
          assignment_marks: studentMarks?.assignment,
        };

        if (existingMark) {
          return marksApi.update(existingMark.id, data);
        } else {
          return marksApi.create(data);
        }
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      const allStudentIds = Object.keys(marks);
      setSavedMarks(new Set(allStudentIds));
      queryClient.invalidateQueries({ queryKey: ['marks'] });
      toast.success('All marks saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save marks');
    },
  });

  const handleMarksChange = (studentId: string, field: string, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    
    startTransition(() => {
      addOptimisticMark({ studentId, field, value: numValue || 0 });
    });

    setMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: numValue,
      },
    }));

    // Remove from saved set if modified
    setSavedMarks(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const handleSaveStudent = (studentId: string) => {
    saveMutation.mutate(studentId);
  };

  const handleSaveAll = () => {
    saveAllMutation.mutate();
  };

  // Convert to select options
  const sessionOptions: SelectOption[] = (sessions || []).map(s => ({ value: s.id, label: s.name }));
  const classOptions: SelectOption[] = assignedClassOptions.map(c => ({ value: c.id, label: c.name }));
  const sectionOptions: SelectOption[] = (sections || []).map(s => ({ value: s.id, label: s.name }));
  const subjectOptions: SelectOption[] = assignedSubjectsForClass.map(a => ({ 
    value: a.subject_id, 
    label: a.subject_info?.name || 'Unknown' 
  }));
  const examTypeOptions: SelectOption[] = (examTypes || []).map(e => ({ value: e.id, label: e.name }));

  const canShowStudents = selectedClass && selectedSection && selectedSubject && selectedExamType;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Entry"
        description="Enter and manage student marks"
        icon={BookOpen}
        actions={
          canShowStudents && students?.results?.length ? (
            <Button 
              onClick={handleSaveAll} 
              isLoading={saveAllMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save All
            </Button>
          ) : null
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Class"
              options={classOptions}
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedSection('');
                setSelectedSubject('');
                setMarks({});
                setSavedMarks(new Set());
              }}
              placeholder="Select class"
            />
            <Select
              label="Section"
              options={sectionOptions}
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setSelectedSubject('');
                setMarks({});
                setSavedMarks(new Set());
              }}
              placeholder="Select section"
              disabled={!selectedClass}
            />
            <Select
              label="Subject"
              options={subjectOptions}
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setMarks({});
                setSavedMarks(new Set());
              }}
              placeholder="Select subject"
              disabled={!selectedSection}
            />
            <Select
              label="Exam Type"
              options={examTypeOptions}
              value={selectedExamType}
              onChange={(e) => {
                setSelectedExamType(e.target.value);
                setMarks({});
                setSavedMarks(new Set());
              }}
              placeholder="Select exam"
            />
          </div>
        </CardContent>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardContent className="p-0">
          {!canShowStudents ? (
            <EmptyState
              icon={BookOpen}
              title="Select filters to begin"
              description="Choose class, section, subject, and exam type to enter marks"
            />
          ) : loadingStudents || loadingExistingMarks ? (
            <TableSkeleton rows={10} columns={6} />
          ) : !students?.results?.length ? (
            <EmptyState
              icon={BookOpen}
              title="No students found"
              description="No students are enrolled in this class/section"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-28">Theory</TableHead>
                  <TableHead className="w-28">Practical</TableHead>
                  <TableHead className="w-28">Assignment</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.results.map((student: Student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.roll_no}</TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={optimisticMarks[student.id]?.theory ?? ''}
                        onChange={(e) => handleMarksChange(student.id, 'theory', e.target.value)}
                        className="w-20"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={optimisticMarks[student.id]?.practical ?? ''}
                        onChange={(e) => handleMarksChange(student.id, 'practical', e.target.value)}
                        className="w-20"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={optimisticMarks[student.id]?.assignment ?? ''}
                        onChange={(e) => handleMarksChange(student.id, 'assignment', e.target.value)}
                        className="w-20"
                        placeholder="0"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {savedMarks.has(student.id) ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Saved
                        </Badge>
                      ) : optimisticMarks[student.id] ? (
                        <Badge variant="warning" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Unsaved
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Empty</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSaveStudent(student.id)}
                        disabled={!optimisticMarks[student.id] || savedMarks.has(student.id)}
                        isLoading={saveMutation.isPending && saveMutation.variables === student.id}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
