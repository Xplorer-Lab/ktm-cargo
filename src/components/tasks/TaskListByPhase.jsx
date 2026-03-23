import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { phaseConfig } from '@/config/taskPhaseConfig';
import { priorityConfig } from '@/config/taskPriorityConfig';

export function TaskListByPhase({
  groupedByPhase,
  tasks,
  onToggle,
  onEdit,
  onDelete,
  resetForm,
  setForm,
  setShowForm,
}) {
  return (
    <div className="space-y-6">
      {Array.from(groupedByPhase.entries()).map(([phase, phaseTasks]) => {
        const config = phaseConfig.get(phase) || phaseConfig.get('pre_launch');
        const completedInPhase = phaseTasks.filter((t) => t.status === 'completed').length;
        const phaseProgress =
          phaseTasks.length > 0 ? (completedInPhase / phaseTasks.length) * 100 : 0;

        return (
          <Card key={phase} className="border-0 shadow-sm overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${config.gradient}`} />
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${config.color}`}>
                    <config.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <Progress value={phaseProgress} className="w-24 h-1.5" />
                      <span className="text-sm text-slate-500">
                        {completedInPhase}/{phaseTasks.length}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    resetForm();
                    setForm((f) => ({ ...f, phase }));
                    setShowForm(true);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {phaseTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function TaskListByPriority({ groupedByPriority, onToggle, onEdit, onDelete }) {
  return (
    <div className="space-y-6">
      {['critical', 'high', 'medium', 'low'].map((priority) => {
        const priorityTasks = groupedByPriority.get(priority) || [];
        if (priorityTasks.length === 0) return null;

        const config = priorityConfig.get(priority) || priorityConfig.get('medium');
        return (
          <Card key={priority} className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${config.dot}`} />
                <CardTitle className="text-lg capitalize">{config.label} Priority</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-2">
                {priorityTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    showPhase
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
