import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isPast, isToday } from "date-fns";
import { he } from "date-fns/locale";

const priorityConfig = {
  low: { color: "bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border-slate-300", label: "נמוכה" },
  medium: { color: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300", label: "בינונית" },
  high: { color: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300", label: "גבוהה" },
  urgent: { color: "bg-gradient-to-r from-red-100 to-red-200 text-red-700 border-red-300", label: "דחופה" }
};

const statusConfig = {
  open: { icon: Circle, color: "text-slate-400", label: "פתוח" },
  in_progress: { icon: Timer, color: "text-blue-500", label: "בתהליך" },
  done: { icon: CheckCircle2, color: "text-green-500", label: "הושלם" },
  canceled: { icon: AlertCircle, color: "text-slate-300", label: "בוטל" }
};

export default function TaskCard({ task, onStatusChange, onEdit, onDelete }) {
  const isOverdue = task.due_at && isPast(new Date(task.due_at)) && task.status !== 'done';
  const isDueToday = task.due_at && isToday(new Date(task.due_at));
  const StatusIcon = statusConfig[task.status]?.icon || Circle;

  const handleToggleComplete = () => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    onStatusChange(task, newStatus);
  };

  return (
    <Card className={`group transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border-r-4 ${
      task.status === 'done' ? 'opacity-60 border-r-green-400 bg-gradient-to-l from-green-50/30' : 
      isOverdue ? 'border-r-red-400 bg-gradient-to-l from-red-50/30' : 
      isDueToday ? 'border-r-orange-400 bg-gradient-to-l from-orange-50/30' : 
      'border-r-transparent hover:border-r-purple-400 hover:bg-gradient-to-l hover:from-purple-50/30'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={task.status === 'done'}
            onCheckedChange={handleToggleComplete}
            className="mt-1"
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`font-medium text-slate-900 ${
                task.status === 'done' ? 'line-through text-slate-500' : ''
              }`}>
                {task.title}
              </h3>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    עריכה
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'in_progress')}>
                    סמן כבתהליך
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(task, 'done')}>
                    סמן כהושלם
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(task)}
                    className="text-red-600"
                  >
                    מחק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {task.description && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className={priorityConfig[task.priority]?.color}>
                {priorityConfig[task.priority]?.label}
              </Badge>

              {task.due_at && (
                <Badge 
                  variant="outline" 
                  className={`flex items-center gap-1 ${
                    isOverdue ? 'bg-red-50 text-red-700 border-red-200' :
                    isDueToday ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    'bg-slate-50 text-slate-600'
                  }`}
                >
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_at), 'dd MMM', { locale: he })}
                </Badge>
              )}

              {task.tags?.map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}