import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export function useReportsFilters() {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'other',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showReportBuilder, setShowReportBuilder] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [runningReportId, setRunningReportId] = useState(null);
  const [sendingReportId, setSendingReportId] = useState(null);

  return {
    dateRange,
    setDateRange,
    activeTab,
    setActiveTab,
    expenseForm,
    setExpenseForm,
    showExpenseForm,
    setShowExpenseForm,
    showReportBuilder,
    setShowReportBuilder,
    editingReport,
    setEditingReport,
    runningReportId,
    setRunningReportId,
    sendingReportId,
    setSendingReportId,
  };
}

export function useReportMutations() {
  const queryClient = useQueryClient();

  const createExpenseMutation = useMutation({
    mutationFn: (data) => db.expenses.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: (data) => db.scheduledReports.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Report created');
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: ({ id, data }) => db.scheduledReports.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Report updated');
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: (id) => db.scheduledReports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast.success('Report deleted');
    },
  });

  return {
    createExpenseMutation,
    createReportMutation,
    updateReportMutation,
    deleteReportMutation,
  };
}

export { format, subDays, startOfMonth, endOfMonth };
