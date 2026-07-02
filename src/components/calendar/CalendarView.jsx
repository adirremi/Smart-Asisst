import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  ChevronLeft, 
  Plus 
} from "lucide-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO
} from "date-fns";
import { he } from "date-fns/locale";

const hebrewDays = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

export default function CalendarView({ events, onDayClick, onEventClick, selectedDate, onDateChange }) {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const days = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const daysArray = [];
    let day = startDate;

    while (day <= endDate) {
      daysArray.push(day);
      day = addDays(day, 1);
    }

    return daysArray;
  }, [currentMonth]);

  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_at);
      return isSameDay(eventDate, day);
    });
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    onDateChange(new Date());
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-purple-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {format(currentMonth, 'MMMM yyyy', { locale: he })}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 shadow-md">
            היום
          </Button>
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-7 border-b">
        {hebrewDays.map((day, idx) => (
          <div 
            key={idx} 
            className="p-3 text-center text-sm font-medium text-slate-500 border-l last:border-l-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const dayIsToday = isToday(day);

          return (
            <div
              key={idx}
              onClick={() => onDayClick(day)}
              className={`min-h-[100px] p-2 border-l border-b cursor-pointer transition-all
                ${!isCurrentMonth ? 'bg-slate-50/50' : 'hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50'}
                ${isSelected ? 'bg-gradient-to-br from-purple-50 to-pink-50 ring-2 ring-purple-400 ring-inset' : ''}
                ${idx % 7 === 0 ? 'border-l-0' : ''}
              `}
            >
              <div className={`
                text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                ${dayIsToday ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg' : ''}
                ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
              `}>
                {format(day, 'd')}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={`
                      text-xs p-1 rounded truncate cursor-pointer transition-all
                      ${event.source === 'google' 
                        ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 hover:from-blue-200 hover:to-blue-300 hover:shadow-md' 
                        : 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 hover:from-purple-200 hover:to-purple-300 hover:shadow-md'
                      }
                    `}
                  >
                    {format(new Date(event.start_at), 'HH:mm')} {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-slate-500 px-1">
                    +{dayEvents.length - 3} נוספים
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}