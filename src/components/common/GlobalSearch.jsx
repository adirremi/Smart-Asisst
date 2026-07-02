import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  X, 
  Calendar, 
  CheckSquare,
  Clock,
  MapPin
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

function GlobalSearch({ 
  tasks, 
  events, 
  onSelectTask, 
  onSelectEvent,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredTasks = query.length >= 2 
    ? tasks.filter(t => 
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.description?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const filteredEvents = query.length >= 2
    ? events.filter(e => 
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.description?.toLowerCase().includes(query.toLowerCase()) ||
        e.location?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const hasResults = filteredTasks.length > 0 || filteredEvents.length > 0;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          ref={inputRef}
          placeholder="חיפוש משימות ואירועים... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pr-10 pl-10 bg-slate-50 border-slate-200 focus:bg-white"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-xl border shadow-lg z-50 overflow-hidden">
          {!hasResults ? (
            <div className="p-4 text-center text-slate-500">
              <p className="text-sm">לא נמצאו תוצאות עבור "{query}"</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto">
              {filteredTasks.length > 0 && (
                <div className="p-2">
                  <div className="px-2 py-1 text-xs font-medium text-slate-500 flex items-center gap-1">
                    <CheckSquare className="h-3 w-3" />
                    משימות
                  </div>
                  {filteredTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => {
                        onSelectTask(task);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="w-full text-right p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{task.title}</p>
                          {task.due_at && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(task.due_at), 'dd MMM', { locale: he })}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {task.status === 'open' ? 'פתוח' : 
                           task.status === 'in_progress' ? 'בתהליך' :
                           task.status === 'done' ? 'הושלם' : 'בוטל'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredEvents.length > 0 && (
                <div className="p-2 border-t">
                  <div className="px-2 py-1 text-xs font-medium text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    אירועים
                  </div>
                  {filteredEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => {
                        onSelectEvent(event);
                        setIsOpen(false);
                        setQuery('');
                      }}
                      className="w-full text-right p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm text-slate-900">{event.title}</p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.start_at), 'dd MMM HH:mm', { locale: he })}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            event.source === 'google' ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          {event.source === 'google' ? 'Google' : 'מקומי'}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalSearch;