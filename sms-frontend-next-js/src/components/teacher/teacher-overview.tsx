/**
 * Teacher Dashboard Overview
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  Clock,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/loading';
import { useAuthStore } from '@/stores/auth-store';
import { sessionsApi } from '@/lib/api';
import { teacherSubjectAssignmentsApi } from '@/lib/api/results';
import type { SubjectAssignment } from '@/types';

export function TeacherOverview() {
  const { user } = useAuthStore();

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ['teacher-assignments', activeSession?.id],
    queryFn: () => teacherSubjectAssignmentsApi.getMyAssignments({
      session_id: activeSession?.id,
    }),
    enabled: !!activeSession?.id,
  });

  const isLoading = loadingSessions || loadingAssignments;

  // Group assignments by class
  const assignmentsByClass = (assignments || []).reduce((acc, assignment) => {
    const className = assignment.class_info?.name || 'Unknown';
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(assignment);
    return acc;
  }, {} as Record<string, SubjectAssignment[]>);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {user?.name || 'Teacher'}!</h2>
              <p className="opacity-90 mt-1">
                {activeSession ? `Active Session: ${activeSession.name}` : 'No active session'}
              </p>
            </div>
            <GraduationCap className="h-12 w-12 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Assigned Subjects"
              value={assignments?.length || 0}
              icon={BookOpen}
              description="This session"
            />
            <StatsCard
              title="Classes"
              value={Object.keys(assignmentsByClass).length}
              icon={Users}
              description="Teaching in"
            />
            <StatsCard
              title="Pending Entries"
              value={0}
              icon={Clock}
              description="Marks to enter"
            />
            <StatsCard
              title="Completed"
              value={0}
              icon={CheckCircle}
              description="Entries done"
            />
          </>
        )}
      </div>

      {/* Assigned Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-600" />
            Your Subject Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !assignments?.length ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No subject assignments for this session</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(assignmentsByClass).map(([className, classAssignments]) => (
                <div key={className} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">{className}</h4>
                  <div className="flex flex-wrap gap-2">
                    {classAssignments.map(assignment => (
                      <Badge
                        key={assignment.id}
                        variant="secondary"
                        className="text-sm py-1 px-3"
                      >
                        {assignment.subject_info?.name} 
                        {assignment.section_info && (
                          <span className="text-gray-500 ml-1">
                            ({assignment.section_info.name})
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/teacher/marks"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Enter Marks</p>
                <p className="text-sm text-gray-500">Subject marks entry</p>
              </div>
            </a>
            <a
              href="/teacher/cocurricular"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Co-curricular</p>
                <p className="text-sm text-gray-500">Activities & grades</p>
              </div>
            </a>
            <a
              href="/teacher/marksheet"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Generate Marksheet</p>
                <p className="text-sm text-gray-500">View & print results</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
