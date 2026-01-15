/**
 * Admin Dashboard Overview Component
 */
"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Users,
  GraduationCap,
  BookOpen,
  DollarSign,
  TrendingUp,
  Calendar,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/loading";
import { formatCurrency } from "@/lib/utils";
import { sessionsApi, studentsApi, classesApi } from "@/lib/api";
import { teacherApi } from "@/lib/api/auth";
import { studentFeesApi } from "@/lib/api/payments";

export function AdminOverview() {
  // Fetch all required data
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["sessions"],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find((s) => s.is_active);

  const { data: classes, isLoading: loadingClasses } = useQuery({
    queryKey: ["classes"],
    queryFn: classesApi.getAll,
  });

  const { data: teachers, isLoading: loadingTeachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: teacherApi.getAll,
  });

  const { data: studentsData, isLoading: loadingStudents } = useQuery({
    queryKey: ["students", { session_id: activeSession?.id }],
    queryFn: () =>
      studentsApi.getAll({ session_id: activeSession?.id, page: 1 }),
    enabled: !!activeSession?.id,
  });

  const { data: feeSummary, isLoading: loadingFees } = useQuery({
    queryKey: ["fee-summary", { session_id: activeSession?.id }],
    queryFn: () => studentFeesApi.getSummary({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const isLoading =
    loadingSessions ||
    loadingClasses ||
    loadingTeachers ||
    loadingStudents ||
    loadingFees;

  return (
    <div className="space-y-6">
      {/* Active Session Banner */}
      {activeSession && (
        <Card className="bg-linear-to-r from-primary-500 to-secondary-500 text-white border-0">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6" />
                <div>
                  <p className="text-sm opacity-90">Active Session</p>
                  <p className="text-lg font-semibold">{activeSession.name}</p>
                </div>
              </div>
              <Badge
                variant="secondary"
                className="bg-white/20 text-white border-0"
              >
                {activeSession.is_locked ? "Locked" : "Active"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatsCard
              title="Total Students"
              value={studentsData?.count || 0}
              icon={Users}
              description="Enrolled this session"
            />
            <StatsCard
              title="Total Teachers"
              value={teachers?.length || 0}
              icon={UserCheck}
              description="Active teachers"
            />
            <StatsCard
              title="Classes"
              value={classes?.length || 0}
              icon={GraduationCap}
              description="Total classes"
            />
            <StatsCard
              title="Fee Collection"
              value={formatCurrency(feeSummary?.total_paid_amount || 0)}
              icon={DollarSign}
              description={`${
                feeSummary?.collection_percentage?.toFixed(1) || 0
              }% collected`}
              iconClassName="bg-green-100"
            />
          </>
        )}
      </div>

      {/* Additional Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fee Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary-600" />
              Fee Collection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFees ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : feeSummary ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Expected</span>
                  <span className="font-semibold">
                    {formatCurrency(feeSummary.total_net_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Collected</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(feeSummary.total_paid_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(feeSummary.total_pending_amount)}
                  </span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Paid: {feeSummary.status_counts?.paid || 0}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      Partial: {feeSummary.status_counts?.partial || 0}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Pending: {feeSummary.status_counts?.pending || 0}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No fee data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <a
                href="/admin/students"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Students</p>
                  <p className="text-sm text-gray-500">
                    Add, edit, or remove students
                  </p>
                </div>
              </a>
              <a
                href="/admin/teachers"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Manage Teachers</p>
                  <p className="text-sm text-gray-500">
                    Teacher accounts and assignments
                  </p>
                </div>
              </a>
              <a
                href="/admin/results"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">View Results</p>
                  <p className="text-sm text-gray-500">
                    Check and manage student results
                  </p>
                </div>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
