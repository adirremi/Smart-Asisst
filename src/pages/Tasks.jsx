import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2,
  CheckSquare,
  ArrowRight,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import TaskForm from "../components/tasks/TaskForm";

export default function Tasks() {
  const [showForm, setShowForm] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
      toast({ title: "משימה נוצרה בהצלחה" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const filteredTasks = React.useMemo(() => {
    return tasks.filter(task => {
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tasks, search]);

  const handleSave = (data) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleToggleDone = (task) => {
    const newStatus = task.status === 'done' ? 'open' : 'done';
    updateMutation.mutate({ 
      id: task.id, 
      data: { ...task, status: newStatus } 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" dir="rtl">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon" className="hover:bg-blue-50">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckSquare className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">משימות</h1>
            </div>

            <Button 
              onClick={() => { setEditingTask(null); setShowForm(true); }}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-lg"
            >
              <Plus className="h-4 w-4 ml-1" />
              חדש
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="חיפוש משימות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-6">
          {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <CheckSquare className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <p className="font-medium text-lg">אין משימות</p>
              <p className="text-sm mt-1">צור משימה חדשה להתחיל</p>
            </div>
          )}

          <div className="space-y-2">
            {filteredTasks.map(task => (
              <div 
                key={task.id}
                className="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Checkbox
                  checked={task.status === 'done'}
                  onCheckedChange={() => handleToggleDone(task)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {task.due_at && (
                      <Badge variant="outline" className="text-xs">
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                  onClick={() => deleteMutation.mutate(task.id)}
                >
                  <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <TaskForm
        open={showForm}
        onOpenChange={setShowForm}
        task={editingTask}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <Toaster />
    </div>
  );
}