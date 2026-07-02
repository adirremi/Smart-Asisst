import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Clock
} from "lucide-react";
import EventCard from "../calendar/EventCard";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  format, 
  startOfWeek, 
  addDays, 
  isSameDay, 
  isToday,
  startOfDay,
  endOfDay
} from "date-fns";
import { he } from "date-fns/locale";

const hebrewDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function CalendarWidget({ 
  events, 
  isLoading, 
  onNewEvent, 
  onEditEvent, 
  onDeleteEvent 
}) {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const viewingToday = isToday(selectedDate);

  // Events for the specific selected day.
  const selectedDayEvents = events.filter(event => {
    const eventDate = new Date(event.start_at);
    return isSameDay(eventDate, selectedDate);
  }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

  // Upcoming events: strictly in the future (already-passed events are hidden).
  const now = new Date();
  const upcomingEvents = events
    .filter(event => new Date(event.start_at) >= now)
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

  // When today is selected, show the upcoming list; otherwise the chosen day.
  const displayEvents = viewingToday ? upcomingEvents : selectedDayEvents;

  const getEventsForDay = (day) => {
    return events.filter(event => isSameDay(new Date(event.start_at), day));
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-white to-purple-50/30 border-2 border-purple-100 shadow-xl">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">לוח שנה</CardTitle>
            <Badge variant="secondary" className="font-normal text-xs bg-purple-100 text-purple-700">
              {displayEvents.length} אירועים
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onNewEvent}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-200"
          >
            <Plus className="h-4 w-4 ml-1" />
            אירוע
          </Button>
          <Link to={createPageUrl("Calendar")}>
            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
              הכל
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col">
        {/* Mini week view */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 mb-4 border border-purple-100">
          <div className="flex items-center justify-between mb-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(selectedDate, 'MMMM yyyy', { locale: he })}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = isSameDay(day, selectedDate);
              const dayIsToday = isToday(day);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    flex flex-col items-center p-2 rounded-lg transition-all
                    ${isSelected ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105' : 'hover:bg-white hover:shadow-md'}
                  `}
                >
                  <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {hebrewDays[idx]}
                  </span>
                  <span className={`
                    text-sm font-medium mt-1 w-7 h-7 flex items-center justify-center rounded-full
                    ${dayIsToday && !isSelected ? 'bg-gradient-to-br from-blue-100 to-purple-100 text-purple-600 font-bold' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {dayEvents.length > 0 && (
                    <div className={`
                      w-1.5 h-1.5 rounded-full mt-1
                      ${isSelected ? 'bg-white' : 'bg-gradient-to-r from-purple-500 to-pink-500'}
                    `} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Upcoming / selected-day events */}
        <div className="flex-1 overflow-auto">
          <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {viewingToday ? 'אירועים קרובים' : format(selectedDate, 'EEEE, d בMMMM', { locale: he })}
          </h3>

          {displayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">אין אירועים</p>
              <p className="text-xs text-slate-400 mt-1">
                {viewingToday ? 'אין אירועים קרובים' : 'היום פנוי לפגישות'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={onNewEvent}
              >
                <Plus className="h-4 w-4 ml-1" />
                צור אירוע
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {displayEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  showDate={viewingToday}
                  onEdit={onEditEvent}
                  onDelete={onDeleteEvent}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}