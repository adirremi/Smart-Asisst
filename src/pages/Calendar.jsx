import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  RefreshCw,
  ArrowRight,
  Calendar as CalendarIcon,
  List
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import CalendarView from "../components/calendar/CalendarView";
import EventCard from "../components/calendar/EventCard";
import EventForm from "../components/calendar/EventForm";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showForm, setShowForm] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState(null);
  const [view, setView] = React.useState('calendar');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.CalendarEvent.list('-start_at'),
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['calendarConnections'],
    queryFn: () => base44.entities.CalendarConnection.list(),
  });

  const connection = connections[0];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
      toast({ title: "אירוע נוצר בהצלחה" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setShowForm(false);
      setEditingEvent(null);
      toast({ title: "אירוע עודכן" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "אירוע נמחק" });
    }
  });

  const handleSave = (data) => {
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleDelete = (event) => {
    if (confirm('למחוק את האירוע?')) {
      deleteMutation.mutate(event.id);
    }
  };

  const handleDayClick = (day) => {
    setSelectedDate(day);
  };

  const selectedDayEvents = events.filter(event => 
    isSameDay(new Date(event.start_at), selectedDate)
  ).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50" dir="rtl">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon" className="hover:bg-purple-50">
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <CalendarIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">לוח שנה</h1>
              {connection && (
                <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300">
                  מחובר ל-Google
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Tabs value={view} onValueChange={setView}>
                <TabsList>
                  <TabsTrigger value="calendar">
                    <CalendarIcon className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button variant="outline" size="sm" className="bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:from-green-100 hover:to-emerald-100">
                <RefreshCw className="h-4 w-4 ml-1" />
                סנכרן
              </Button>

              <Button 
                onClick={() => { setEditingEvent(null); setShowForm(true); }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-200"
              >
                <Plus className="h-4 w-4 ml-1" />
                אירוע חדש
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {view === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <CalendarView
                events={events}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                onDayClick={handleDayClick}
                onEventClick={handleEdit}
              />
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {format(selectedDate, 'EEEE, d בMMMM', { locale: he })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDayEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-500">אין אירועים ביום זה</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-3"
                        onClick={() => { setEditingEvent(null); setShowForm(true); }}
                      >
                        <Plus className="h-4 w-4 ml-1" />
                        צור אירוע
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDayEvents.map(event => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>כל האירועים</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">אין אירועים</p>
                  <Button 
                    className="mt-4"
                    onClick={() => { setEditingEvent(null); setShowForm(true); }}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    אירוע חדש
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <EventForm
        open={showForm}
        onOpenChange={setShowForm}
        event={editingEvent}
        onSave={handleSave}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isGoogleConnected={!!connection}
      />

      <Toaster />
    </div>
  );
}