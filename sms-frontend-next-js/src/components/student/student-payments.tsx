/**
 * Student Payment Portal Component
 */
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, CreditCard, CheckCircle, Clock, AlertCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/empty-state';
import { TableSkeleton } from '@/components/ui/loading';
import { PageHeader } from '@/components/layout/page-header';
import { sessionsApi } from '@/lib/api';
import { studentFeesApi, paymentsApi } from '@/lib/api/payments';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export function StudentPayments() {
  const queryClient = useQueryClient();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedFee, setSelectedFee] = useState<any>(null);

  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: sessionsApi.getAll,
  });

  const activeSession = sessions?.find(s => s.is_active);

  const { data: feeStatus, isLoading: loadingFees } = useQuery({
    queryKey: ['my-fees', activeSession?.id],
    queryFn: () => studentFeesApi.getMyFees({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const { data: paymentHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['my-payments', activeSession?.id],
    queryFn: () => paymentsApi.getMyPayments({ session_id: activeSession?.id }),
    enabled: !!activeSession?.id,
  });

  const paymentMutation = useMutation({
    mutationFn: async (data: { fee_id: string; amount: number }) => {
      // In a real app, this would integrate with a payment gateway
      return paymentsApi.create({
        student_fee_id: data.fee_id,
        amount: data.amount,
        payment_method: 'online',
        transaction_id: `TXN${Date.now()}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-fees'] });
      queryClient.invalidateQueries({ queryKey: ['my-payments'] });
      setIsPaymentModalOpen(false);
      setSelectedFee(null);
      setPaymentAmount('');
      toast.success('Payment successful');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Payment failed');
    },
  });

  const openPaymentModal = (fee: any) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.pending_amount.toString());
    setIsPaymentModalOpen(true);
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (amount > selectedFee.pending_amount) {
      toast.error('Amount exceeds pending balance');
      return;
    }
    paymentMutation.mutate({ fee_id: selectedFee.id, amount });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" /> Paid</Badge>;
      case 'partial':
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> Partial</Badge>;
      case 'pending':
        return <Badge variant="danger" className="gap-1"><AlertCircle className="h-3 w-3" /> Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Payments"
        description="View and pay your school fees"
        icon={DollarSign}
      />

      {/* Fee Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Total Fee</p>
                <p className="text-xl font-bold text-blue-900">
                  {formatCurrency(feeStatus?.total_amount || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600">Paid</p>
                <p className="text-xl font-bold text-green-900">
                  {formatCurrency(feeStatus?.total_paid || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600">Due</p>
                <p className="text-xl font-bold text-red-900">
                  {formatCurrency(feeStatus?.total_due || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingFees ? (
            <TableSkeleton rows={5} columns={6} />
          ) : !feeStatus?.fees?.length ? (
            <EmptyState
              icon={DollarSign}
              title="No fee records"
              description="Your fee details will appear here"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStatus.fees.map((fee: any) => (
                  <TableRow key={fee.id}>
                    <TableCell className="font-medium">{fee.fee_type}</TableCell>
                    <TableCell className="text-right">{formatCurrency(fee.amount)}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {fee.discount > 0 ? `-${formatCurrency(fee.discount)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(fee.net_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(fee.paid_amount)}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(fee.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {fee.status !== 'paid' && (
                        <Button
                          size="sm"
                          onClick={() => openPaymentModal(fee)}
                          leftIcon={<CreditCard className="h-4 w-4" />}
                        >
                          Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistory ? (
            <TableSkeleton rows={5} columns={5} />
          ) : !paymentHistory?.length ? (
            <EmptyState
              icon={Receipt}
              title="No payment history"
              description="Your payment transactions will appear here"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Fee Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.payment_date)}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.transaction_id}</TableCell>
                    <TableCell>{payment.fee_type}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payment.payment_method}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Make Payment"
        size="md"
      >
        {selectedFee && (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fee Type</span>
                <span className="font-medium">{selectedFee.fee_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pending Amount</span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(selectedFee.pending_amount)}
                </span>
              </div>
            </div>

            <Input
              label="Payment Amount"
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              min={1}
              max={selectedFee.pending_amount}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />

            <div className="text-sm text-gray-500">
              <p>• Payment will be processed securely</p>
              <p>• You can pay partial amounts</p>
              <p>• Receipt will be sent to your email</p>
            </div>
          </div>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            isLoading={paymentMutation.isPending}
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Pay {paymentAmount && formatCurrency(parseFloat(paymentAmount))}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
