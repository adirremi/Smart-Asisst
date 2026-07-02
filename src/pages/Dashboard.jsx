import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  CheckSquare,
  Loader2
} from "lucide-react";
import TasksWidget from "../components/dashboard/TasksWidget";
import CalendarWidget from "../components/dashboard/CalendarWidget";
import GoogleCalendarStatus from "../components/dashboard/GoogleCalendarStatus";
import GlobalSearch from "../components/common/GlobalSearch";
import TaskForm from "../components/tasks/TaskForm";
import EventForm from "../components/calendar/EventForm";
import { createPageUrl } from "@/utils";

export default function Dashboard() {
  const [user, setUser] = React.useState(null);
  const [showTaskForm, setShowTaskForm] = React.useState(false);
  const [showEventForm, setShowEventForm] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState(null);
  const [editingEvent, setEditingEvent] = React.useState(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  // Tasks query
  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  // Events query
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_at'),
  });

  // Calendar connection query
  const { data: connections = [] } = useQuery({
    queryKey: ['calendarConnections'],
    queryFn: () => base44.entities.CalendarConnection.list(),
  });

  const connection = connections[0];

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
      toast({ title: "משימה נוצרה בהצלחה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה ביצירת משימה", description: error.message, variant: "destructive" });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskForm(false);
      setEditingTask(null);
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון משימה", description: error.message, variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  // Event mutations
  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEditingEvent(null);
      toast({ title: "אירוע נוצר בהצלחה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה ביצירת אירוע", description: error.message, variant: "destructive" });
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowEventForm(false);
      setEditingEvent(null);
      toast({ title: "אירוע עודכן בהצלחה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון אירוע", description: error.message, variant: "destructive" });
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "אירוע נמחק" });
    }
  });

  const handleTaskSave = (data) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleTaskStatusChange = (task, newStatus) => {
    updateTaskMutation.mutate({ id: task.id, data: { ...task, status: newStatus } });
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskDelete = (task) => {
    if (confirm('למחוק את המשימה?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const handleEventSave = (data) => {
    if (editingEvent) {
      updateEventMutation.mutate({ id: editingEvent.id, data });
    } else {
      createEventMutation.mutate(data);
    }
  };

  const handleEventEdit = (event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleEventDelete = (event) => {
    if (confirm('למחוק את האירוע?')) {
      deleteEventMutation.mutate(event.id);
    }
  };

  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleConnectGoogle = () => {
    toast({ 
      title: "חיבור Google Calendar",
      description: "עבור להגדרות כדי לחבר את Google Calendar",
      action: {
        label: "עבור להגדרות",
        onClick: () => window.location.href = createPageUrl("Settings")
      }
    });
  };

  const handleSync = async () => {
    setIsSyncing(true);
    toast({ title: "מסנכרן...", description: "מעדכן אירועים מ-Google Calendar", duration: 3000 });
    
    try {
      const response = await base44.functions.invoke('syncGoogleCalendar', {});
      console.log('Sync response:', response);
      
      if (response.data && response.data.success) {
        toast({ 
          title: "סנכרון הושלם!",
          description: response.data.message,
          duration: 3000
        });
        queryClient.invalidateQueries({ queryKey: ['events'] });
      } else {
        toast({ 
          title: "שגיאה בסנכרון",
          description: response.data?.error || "נכשל בסנכרון",
          variant: "destructive",
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast({ 
        title: "שגיאה בסנכרון",
        description: error.response?.data?.error || error.message || "נכשל בסנכרון עם Google Calendar",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" dir="rtl">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Tasks & Calendar
                  </h1>
                  {user && (
                    <span className="text-xs text-slate-500">
                      שלום, {user.full_name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <GlobalSearch
                tasks={tasks}
                events={events}
                onSelectTask={handleTaskEdit}
                onSelectEvent={handleEventEdit}
                className="w-64 hidden md:block"
              />

              <Button 
                variant="outline" 
                size="sm"
                className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200 text-blue-700"
                onClick={() => {
                  setEditingTask(null);
                  setShowTaskForm(true);
                }}
              >
                <CheckSquare className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">משימה חדשה</span>
              </Button>

              <Button 
                size="sm"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-200"
                onClick={() => {
                  setEditingEvent(null);
                  setShowEventForm(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">אירוע חדש</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Google Calendar status */}
        <div className="mb-6">
          <GoogleCalendarStatus
            connection={connection}
            onConnect={handleConnectGoogle}
            onSync={handleSync}
            isSyncing={isSyncing}
            isConnecting={false}
          />
        </div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TasksWidget
            tasks={tasks}
            isLoading={tasksLoading}
            onNewTask={() => {
              setEditingTask(null);
              setShowTaskForm(true);
            }}
            onStatusChange={handleTaskStatusChange}
            onEdit={handleTaskEdit}
            onDelete={handleTaskDelete}
          />

          <CalendarWidget
            events={events}
            isLoading={eventsLoading}
            onNewEvent={() => {
              setEditingEvent(null);
              setShowEventForm(true);
            }}
            onEditEvent={handleEventEdit}
            onDeleteEvent={handleEventDelete}
          />
        </div>
      </main>

      {/* Forms */}
      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        task={editingTask}
        onSave={handleTaskSave}
        isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
      />

      <EventForm
        open={showEventForm}
        onOpenChange={setShowEventForm}
        event={editingEvent}
        onSave={handleEventSave}
        isLoading={createEventMutation.isPending || updateEventMutation.isPending}
        isGoogleConnected={!!connection}
      />

      <Toaster />
    </div>
  );
}