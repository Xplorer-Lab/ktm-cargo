import { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { auth } from '@/api/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Target,
  TrendingUp,
  Flag,
  Search,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { isPast, addDays } from 'date-fns';
import { triggerTaskAssignedAlert } from '@/components/notifications/NotificationService';
import { phaseConfig } from '@/config/taskPhaseConfig';
import { priorityConfig } from '@/config/taskPriorityConfig';
import { TaskListByPhase, TaskListByPriority } from '@/components/tasks/TaskListByPhase';

export default function Tasks() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('phase');

  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => db.tasks.list('-priority', 200),
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    phase: 'pre_launch',
    month: 1,
    estimated_cost: 0,
    priority: 'medium',
    due_date: '',
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const task = await db.tasks.create(data);
      const user = await auth.me().catch(() => null);
      if (user?.email) {
        await triggerTaskAssignedAlert({ ...data, id: task.id }, user.email);
      }
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      resetForm();
      toast.success('Task created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.tasks.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      phase: task.phase || 'pre_launch',
      month: task.month || 1,
      estimated_cost: task.estimated_cost || 0,
      priority: task.priority || 'medium',
      due_date: task.due_date || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      phase: 'pre_launch',
      month: 1,
      estimated_cost: 0,
      priority: 'medium',
      due_date: '',
    });
    setEditingTask(null);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => db.tasks.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
    },
  });

  const toggleStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesPhase = phaseFilter === 'all' || t.phase === phaseFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' && t.status === 'completed') ||
      (statusFilter === 'pending' && t.status !== 'completed') ||
      (statusFilter === 'overdue' &&
        t.due_date &&
        isPast(new Date(t.due_date)) &&
        t.status !== 'completed');
    const matchesSearch =
      !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPhase && matchesStatus && matchesSearch;
  });

  const groupedByPhase = filteredTasks.reduce((acc, task) => {
    const phase = task.phase || 'pre_launch';
    if (!acc.has(phase)) acc.set(phase, []);
    acc.get(phase).push(task);
    return acc;
  }, new Map());

  const groupedByPriority = filteredTasks.reduce((acc, task) => {
    const priority = task.priority || 'medium';
    if (!acc.has(priority)) acc.set(priority, []);
    acc.get(priority).push(task);
    return acc;
  }, new Map());

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;
  const totalEstCost = tasks.reduce((sum, t) => sum + (t.estimated_cost || 0), 0);
  const overdueCount = tasks.filter(
    (t) => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed'
  ).length;
  const criticalCount = tasks.filter(
    (t) => t.priority === 'critical' && t.status !== 'completed'
  ).length;
  const dueSoonCount = tasks.filter((t) => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const soon = addDays(new Date(), 7);
    return dueDate <= soon && !isPast(dueDate);
  }).length;

  useEffect(() => {
    if (!isLoading && tasks.length === 0) {
      const initialTasks = [
        {
          title: 'Consult with business lawyer',
          phase: 'pre_launch',
          month: 1,
          estimated_cost: 7500,
          priority: 'high',
        },
        {
          title: 'Research air cargo partners (JK Logistics, Pattaya Airways)',
          phase: 'pre_launch',
          month: 1,
          estimated_cost: 0,
          priority: 'high',
        },
        {
          title: 'Survey target customers in Myanmar community groups',
          phase: 'pre_launch',
          month: 1,
          estimated_cost: 0,
          priority: 'medium',
        },
        {
          title: 'Analyze competitor pricing and services',
          phase: 'pre_launch',
          month: 1,
          estimated_cost: 0,
          priority: 'medium',
        },
        {
          title: 'Submit company registration to DBD',
          phase: 'registration',
          month: 2,
          estimated_cost: 30000,
          priority: 'critical',
        },
        {
          title: 'Apply for Import/Export license',
          phase: 'registration',
          month: 2,
          estimated_cost: 12500,
          priority: 'critical',
        },
        {
          title: 'Open business bank account',
          phase: 'registration',
          month: 2,
          estimated_cost: 0,
          priority: 'high',
        },
        {
          title: 'Create Facebook Business Page',
          phase: 'infrastructure',
          month: 3,
          estimated_cost: 0,
          priority: 'high',
        },
        {
          title: 'Set up LINE Official Account',
          phase: 'infrastructure',
          month: 3,
          estimated_cost: 0,
          priority: 'medium',
        },
        {
          title: 'Create Google Business Profile',
          phase: 'infrastructure',
          month: 3,
          estimated_cost: 0,
          priority: 'medium',
        },
        {
          title: 'Create booking form (Google Forms)',
          phase: 'infrastructure',
          month: 3,
          estimated_cost: 0,
          priority: 'high',
        },
        {
          title: 'Finalize air cargo partnership agreements',
          phase: 'partnership',
          month: 3,
          estimated_cost: 7500,
          priority: 'critical',
        },
        {
          title: 'Conduct test shipments (5-10)',
          phase: 'partnership',
          month: 3,
          estimated_cost: 5000,
          priority: 'high',
        },
        {
          title: 'Launch Facebook Ads campaign',
          phase: 'marketing',
          month: 4,
          estimated_cost: 15000,
          priority: 'high',
        },
        {
          title: 'Start posting in community groups',
          phase: 'marketing',
          month: 4,
          estimated_cost: 0,
          priority: 'medium',
        },
        {
          title: 'Launch referral program',
          phase: 'marketing',
          month: 4,
          estimated_cost: 7500,
          priority: 'medium',
        },
      ];
      initialTasks.forEach((task) => {
        db.tasks.create(task);
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  }, [isLoading, tasks.length, queryClient]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900">
              Business Tasks
            </h1>
            <p className="text-sm text-slate-500 mt-1">Implementation roadmap & task management</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add </span>Task
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-[10px] sm:text-xs uppercase font-medium">
                    Progress
                  </p>
                  <p className="text-xl sm:text-2xl font-bold">{Math.round(progress)}%</p>
                  <p className="text-blue-100 text-[10px] sm:text-xs">
                    {completedCount}/{tasks.length}
                  </p>
                </div>
                <Target className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200" />
              </div>
              <Progress value={progress} className="h-1.5 mt-2 sm:mt-3 bg-blue-400" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg sm:text-2xl font-bold text-slate-900">
                    ฿{(totalEstCost / 1000).toFixed(0)}k
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Est. Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-rose-100 rounded-lg">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{criticalCount}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-100 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{dueSoonCount}</p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Due Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className={`border-0 shadow-sm ${overdueCount > 0 ? 'bg-rose-50 border-rose-200' : ''}`}
          >
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`p-1.5 sm:p-2 rounded-lg ${overdueCount > 0 ? 'bg-rose-200' : 'bg-slate-100'}`}
                >
                  <Flag
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-600'}`}
                  />
                </div>
                <div>
                  <p
                    className={`text-xl sm:text-2xl font-bold ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}
                  >
                    {overdueCount}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="h-auto flex-wrap p-1 gap-1">
                  <TabsTrigger value="all" className="text-xs sm:text-sm">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs sm:text-sm">
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-xs sm:text-sm">
                    Done
                  </TabsTrigger>
                  <TabsTrigger value="overdue" className="text-rose-600 text-xs sm:text-sm">
                    Overdue
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'phase' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('phase')}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">By </span>Phase
                </Button>
                <Button
                  variant={viewMode === 'priority' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('priority')}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">By </span>Priority
                </Button>
              </div>
            </div>

            {/* Phase Filter Pills */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-4 pt-4 border-t">
              <Button
                variant={phaseFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPhaseFilter('all')}
                className="rounded-full text-xs sm:text-sm px-2 sm:px-3"
              >
                All
              </Button>
              {Array.from(phaseConfig.entries()).map(([key, config]) => {
                const count = tasks.filter((t) => t.phase === key).length;
                return (
                  <Button
                    key={key}
                    variant={phaseFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPhaseFilter(key)}
                    className="gap-1 sm:gap-2 rounded-full text-xs sm:text-sm px-2 sm:px-3"
                  >
                    <config.icon className="w-3 h-3" />
                    <span className="hidden sm:inline">{config.label}</span>
                    <span className="sm:hidden">{config.label.substring(0, 3)}</span>
                    <span className="text-[10px] sm:text-xs opacity-70">({count})</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        {isLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={`skeleton-task-${i}`} className="h-32" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
              <p className="text-slate-500 mb-6">
                {searchQuery || statusFilter !== 'all' || phaseFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first task to get started'}
              </p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> Add Task
              </Button>
            </CardContent>
          </Card>
        ) : viewMode === 'phase' ? (
          <TaskListByPhase
            groupedByPhase={groupedByPhase}
            tasks={tasks}
            onToggle={toggleStatus}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
            resetForm={resetForm}
            setForm={setForm}
            setShowForm={setShowForm}
          />
        ) : (
          <TaskListByPriority
            groupedByPriority={groupedByPriority}
            onToggle={toggleStatus}
            onEdit={handleEdit}
            onDelete={(id) => deleteMutation.mutate(id)}
          />
        )}

        {/* Task Form Dialog */}
        <Dialog
          open={showForm}
          onOpenChange={(v) => {
            setShowForm(v);
            if (!v) resetForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Task Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Task details..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select value={form.phase} onValueChange={(v) => setForm({ ...form, phase: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(phaseConfig.entries()).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Month</Label>
                  <Select
                    value={form.month.toString()}
                    onValueChange={(v) => setForm({ ...form, month: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          Month {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Cost (THB)</Label>
                  <Input
                    type="number"
                    value={form.estimated_cost}
                    onChange={(e) =>
                      setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from(priorityConfig.entries()).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingTask ? 'Update Task' : 'Add Task'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
