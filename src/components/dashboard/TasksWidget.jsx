import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  CheckCircle2,
  ArrowLeft,
  Trash2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function TasksWidget({ 
  tasks, 
  isLoading, 
  onNewTask, 
  onStatusChange, 
  onEdit, 
  onDelete 
}) {
  const handleToggleDone = (task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    onStatusChange(task, newStatus);
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-white to-blue-50/30 border-2 border-blue-100 shadow-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-blue-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">משימות</CardTitle>
            <Badge variant="secondary" className="font-normal text-xs bg-blue-100 text-blue-700">
              {tasks.filter(t => t.status !== 'done').length} פעילות
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNewTask}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-200"
          >
            <Plus className="h-4 w-4 ml-1" />
            חדשה
          </Button>
          <Link to={createPageUrl("Tasks")}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
              הכל
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-slate-300 mb-4" />
            <p className="text-sm font-medium text-slate-600">אין משימות</p>
            <p className="text-xs text-slate-400 mt-1">צור משימה חדשה להתחיל</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map(task => (
              <div 
                key={task.id}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors"
              >
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={() => handleToggleDone(task)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </p>
                  {task.due_at && (
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(task.due_at), 'dd MMM', { locale: he })}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100"
                  onClick={() => onDelete(task)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}