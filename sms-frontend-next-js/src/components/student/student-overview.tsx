/**
 * Student Dashboard Overview
 */
'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  BookOpen, 
  DollarSign, 
  GraduationCap,
  Calendar,
  FileText,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/loading';
import { useAuthStore } from '@/stores/auth-store';
import { sessionsApi } from '@/lib/api';
import { studentResultsApi } from '@/lib/api/results';
import { studentFeesApi } from '@/lib/api/payments';
import { formatCurrency } from '@/lib/utils';

export function StudentOverview() {
  const { user } = useAuthStore();

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['my-results', activeSession?.id],
    queryFn: () => studentResultsApi.getMyResults({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const { data: feeStatus, isLoading: loadingFees } = useQuery({
    queryKey: ['my-fees', activeSession?.id],
    queryFn: () => studentFeesApi.getMyFees({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const isLoading = loadingSessions || loadingResults || loadingFees;

  const latestResult = results?.[0];
  const totalPaid = feeStatus?.total_paid || 0;
  const totalDue = feeStatus?.total_due || 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <Card className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white border-0">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Welcome, {user?.name || 'Student'}!</h2>
              <p className="opacity-90 mt-1">
                {activeSession ? `Session: ${activeSession.name}` : 'No active session'}
              </p>
              {user?.class_info && (
                <p className="opacity-90">
                  Class: {user.class_info.name} {user?.section_info && `- Section ${user.section_info.name}`}
                </p>
              )}
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
              title="Latest Result"
              value={latestResult?.percentage ? `${latestResult.percentage.toFixed(1)}%` : '-'}
              icon={BookOpen}
              description={latestResult?.exam_type || 'No results yet'}
            />
            <StatsCard
              title="Grade"
              value={latestResult?.overall_grade || '-'}
              icon={GraduationCap}
              description={latestResult?.is_passed ? 'Passed' : 'Pending'}
            />
            <StatsCard
              title="Fee Paid"
              value={formatCurrency(totalPaid)}
              icon={DollarSign}
              description="This session"
              iconClassName="bg-green-100"
            />
            <StatsCard
              title="Fee Due"
              value={formatCurrency(totalDue)}
              icon={DollarSign}
              description="Remaining balance"
              iconClassName={totalDue > 0 ? 'bg-red-100' : 'bg-green-100'}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Results Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              Recent Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingResults ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !results?.length ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No results available yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.slice(0, 3).map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{result.exam_type}</p>
                      <p className="text-sm text-gray-500">{result.session}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{result.percentage?.toFixed(1)}%</p>
                      <Badge variant={result.is_passed ? 'success' : 'danger'}>
                        {result.overall_grade}
                      </Badge>
                    </div>
                  </div>
                ))}
                <a
                  href="/student/results"
                  className="block text-center text-sm text-primary-600 hover:text-primary-700 mt-4"
                >
                  View All Results →
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fee Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary-600" />
              Fee Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFees ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : feeStatus ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Fee</span>
                  <span className="font-semibold">{formatCurrency(feeStatus.total_amount ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-gray-600">Paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(feeStatus.total_paid ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-gray-600">Due</span>
                  <span className="font-semibold text-red-600">{formatCurrency(feeStatus.total_due ?? 0)}</span>
                </div>
                
                {(feeStatus.total_due ?? 0) > 0 && (
                  <a
                    href="/student/payments"
                    className="block w-full"
                  >
                    <button className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                      Pay Now
                    </button>
                  </a>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p>No fee information available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href="/student/results"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Results</p>
                <p className="text-sm text-gray-500">Check all exam results</p>
              </div>
            </a>
            <a
              href="/student/marksheet"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Download Marksheet</p>
                <p className="text-sm text-gray-500">Get your marksheet PDF</p>
              </div>
            </a>
            <a
              href="/student/payments"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Fee Payments</p>
                <p className="text-sm text-gray-500">View & pay fees online</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
