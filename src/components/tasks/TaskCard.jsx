import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import { format } from 'date-fns';
import { phaseConfig } from '@/config/taskPhaseConfig';
import { priorityConfig } from '@/config/taskPriorityConfig';

export function TaskCard({ task, onToggle, onEdit, onDelete, showPhase = false }) {
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'completed';
  const isDueToday = task.due_date && isToday(new Date(task.due_date));
  const priorityConf = priorityConfig.get(task.priority) || priorityConfig.get('medium');
  const phaseConf = phaseConfig.get(task.phase) || phaseConfig.get('pre_launch');

  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
        task.status === 'completed'
          ? 'bg-slate-50 border-slate-100 opacity-70'
          : isOverdue
            ? 'bg-rose-50 border-rose-200 hover:border-rose-300'
            : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
      }`}
      onClick={() => onEdit(task)}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className="mt-0.5 flex-shrink-0"
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <Circle
            className={`w-5 h-5 ${isOverdue ? 'text-rose-300' : 'text-slate-300'} hover:text-blue-500 transition-colors`}
          />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}
          >
            {task.title}
          </p>
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${priorityConf.dot}`}
            title={`${priorityConf.label} priority`}
          />
        </div>

        {task.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {showPhase && (
            <Badge className={`${phaseConf.color} text-xs`}>
              <phaseConf.icon className="w-3 h-3 mr-1" />
              {phaseConf.label}
            </Badge>
          )}

          {task.due_date && (
            <Badge
              variant="outline"
              className={`text-xs ${isOverdue ? 'border-rose-300 text-rose-600 bg-rose-50' : isDueToday ? 'border-amber-300 text-amber-600 bg-amber-50' : ''}`}
            >
              <Calendar className="w-3 h-3 mr-1" />
              {isOverdue ? 'Overdue: ' : isDueToday ? 'Today: ' : ''}
              {format(new Date(task.due_date), 'MMM d')}
            </Badge>
          )}

          {task.month && (
            <Badge variant="outline" className="text-xs">
              Month {task.month}
            </Badge>
          )}

          {task.estimated_cost > 0 && (
            <Badge
              variant="outline"
              className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50"
            >
              ฿{task.estimated_cost.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(task.id);
        }}
        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-100 rounded-lg transition-all flex-shrink-0"
      >
        <Trash2 className="w-4 h-4 text-rose-500" />
      </button>
    </div>
  );
}
