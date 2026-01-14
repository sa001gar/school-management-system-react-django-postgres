/**
 * Cocurricular Entry Component for Teachers
 */
'use client';

import { useState, useOptimistic, useTransition, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, type SelectOption } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi, classesApi, sectionsApi, studentsApi } from '@/lib/api';
import { cocurricularApi } from '@/lib/api/results';
import type { Student, CocurricularGrade } from '@/types';
import { toast } from 'sonner';

const GRADE_OPTIONS: SelectOption[] = [
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C+', label: 'C+' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
];

const COCURRICULAR_ACTIVITIES = [
  { id: 'art', name: 'Art & Craft' },
  { id: 'music', name: 'Music' },
  { id: 'dance', name: 'Dance' },
  { id: 'sports', name: 'Sports' },
  { id: 'computer', name: 'Computer' },
  { id: 'library', name: 'Library' },
];

interface GradesState {
  [studentId: string]: {
    [activityId: string]: string;
  };
}

export function CocurricularEntry() {
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  
  const [grades, setGrades] = useState<GradesState>({});
  const [savedGrades, setSavedGrades] = useState<Set<string>>(new Set());

  // Optimistic grades
  const [optimisticGrades, addOptimisticGrade] = useOptimistic(
    grades,
    (state, update: { studentId: string; activityId: string; grade: string }) => ({
      ...state,
      [update.studentId]: {
        ...state[update.studentId],
        [update.activityId]: update.grade,
      },
    })
  );

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

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['students', { session_id: activeSession?.id, class_id: selectedClass, section_id: selectedSection }],
    queryFn: () => studentsApi.getAll({
      session_id: activeSession?.id,
      class_id: selectedClass,
      section_id: selectedSection,
      page: 1,
    }),
    enabled: !!selectedClass && !!selectedSection && !!activeSession?.id,
  });

  const { data: existingGrades, isLoading: loadingGrades } = useQuery({
    queryKey: ['cocurricular-grades', { session_id: activeSession?.id, class_id: selectedClass, section_id: selectedSection }],
    queryFn: () => cocurricularApi.getAll({
      session_id: activeSession?.id,
      class_id: selectedClass,
      section_id: selectedSection,
    }),
    enabled: !!selectedClass && !!selectedSection && !!activeSession?.id,
  });

  // Populate grades state when data loads
  useEffect(() => {
    if (existingGrades) {
      const gradesState: GradesState = {};
      existingGrades?.forEach((grade: CocurricularGrade) => {
        if (!gradesState[grade.student_id]) {
          gradesState[grade.student_id] = {};
        }
        const activityId = grade.activity_id || grade.cocurricular_subject_id;
        gradesState[grade.student_id][activityId] = grade.grade;
      });
      setGrades(gradesState);
    }
  }, [existingGrades]);

  const saveMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const studentGrades = grades[studentId];
      if (!studentGrades) return;

      const promises = Object.entries(studentGrades).map(([activityId, grade]) => {
        const existingGrade = existingGrades?.find(
          (g: CocurricularGrade) => g.student_id === studentId && 
            (g.activity_id === activityId || g.cocurricular_subject_id === activityId)
        );

        const data = {
          student_id: studentId,
          cocurricular_subject_id: activityId,
          session_id: activeSession?.id,
          grade,
        };

        if (existingGrade) {
          return cocurricularApi.update(existingGrade.id, data);
        } else {
          return cocurricularApi.create(data);
        }
      });

      return Promise.all(promises);
    },
    onSuccess: (_, studentId) => {
      setSavedGrades(prev => new Set(prev).add(studentId));
      queryClient.invalidateQueries({ queryKey: ['cocurricular-grades'] });
      toast.success('Grades saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save grades');
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(grades).flatMap(([studentId, studentGrades]) =>
        Object.entries(studentGrades).map(([activityId, grade]) => {
          const existingGrade = existingGrades?.find(
            (g: CocurricularGrade) => g.student_id === studentId && 
              (g.activity_id === activityId || g.cocurricular_subject_id === activityId)
          );

          const data = {
            student_id: studentId,
            cocurricular_subject_id: activityId,
            session_id: activeSession?.id,
            grade,
          };

          if (existingGrade) {
            return cocurricularApi.update(existingGrade.id, data);
          } else {
            return cocurricularApi.create(data);
          }
        })
      );

      return Promise.all(promises);
    },
    onSuccess: () => {
      setSavedGrades(new Set(Object.keys(grades)));
      queryClient.invalidateQueries({ queryKey: ['cocurricular-grades'] });
      toast.success('All grades saved successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save grades');
    },
  });

  const handleGradeChange = (studentId: string, activityId: string, grade: string) => {
    startTransition(() => {
      addOptimisticGrade({ studentId, activityId, grade });
    });

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [activityId]: grade,
      },
    }));

    setSavedGrades(prev => {
      const next = new Set(prev);
      next.delete(studentId);
      return next;
    });
  };

  const classOptions: SelectOption[] = (classes || []).map(c => ({ value: c.id, label: c.name }));
  const sectionOptions: SelectOption[] = (sections || []).map(s => ({ value: s.id, label: s.name }));

  const canShowStudents = selectedClass && selectedSection;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Co-curricular Entry"
        description="Enter grades for co-curricular activities"
        icon={Award}
        actions={
          canShowStudents && students?.results?.length ? (
            <Button
              onClick={() => saveAllMutation.mutate()}
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
                setGrades({});
                setSavedGrades(new Set());
              }}
              placeholder="Select class"
            />
            <Select
              label="Section"
              options={sectionOptions}
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                setGrades({});
                setSavedGrades(new Set());
              }}
              placeholder="Select section"
              disabled={!selectedClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* Grades Table */}
      <Card>
        <CardContent className="p-0">
          {!canShowStudents ? (
            <EmptyState
              icon={Award}
              title="Select class and section"
              description="Choose a class and section to enter co-curricular grades"
            />
          ) : loadingStudents || loadingGrades ? (
            <TableSkeleton rows={10} columns={8} />
          ) : !students?.results?.length ? (
            <EmptyState
              icon={Award}
              title="No students found"
              description="No students are enrolled in this class/section"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    {COCURRICULAR_ACTIVITIES.map(activity => (
                      <TableHead key={activity.id} className="w-24 text-center">
                        {activity.name}
                      </TableHead>
                    ))}
                    <TableHead className="w-24 text-center">Status</TableHead>
                    <TableHead className="w-20 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.results.map((student: Student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.roll_no}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      {COCURRICULAR_ACTIVITIES.map(activity => (
                        <TableCell key={activity.id}>
                          <Select
                            options={GRADE_OPTIONS}
                            value={optimisticGrades[student.id]?.[activity.id] || ''}
                            onChange={(e) => handleGradeChange(student.id, activity.id, e.target.value)}
                            placeholder="-"
                            className="w-20"
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {savedGrades.has(student.id) ? (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Saved
                          </Badge>
                        ) : optimisticGrades[student.id] && Object.keys(optimisticGrades[student.id]).length > 0 ? (
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
                          onClick={() => saveMutation.mutate(student.id)}
                          disabled={!optimisticGrades[student.id] || savedGrades.has(student.id)}
                          isLoading={saveMutation.isPending && saveMutation.variables === student.id}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
