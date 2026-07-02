import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  MapPin, 
  Users, 
  MoreHorizontal,
  ExternalLink
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const sourceConfig = {
  google: { color: "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-700 border-blue-300", label: "Google" },
  local: { color: "bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border-purple-300", label: "מקומי" },
  webhook: { color: "bg-gradient-to-r from-pink-100 to-pink-200 text-pink-700 border-pink-300", label: "Webhook" }
};

export default function EventCard({ event, onEdit, onDelete, compact = false, showDate = false }) {
  const startTime = format(new Date(event.start_at), 'HH:mm', { locale: he });
  const endTime = format(new Date(event.end_at), 'HH:mm', { locale: he });
  const dateLabel = format(new Date(event.start_at), 'EEEE, d בMMM', { locale: he });

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gradient-to-l hover:from-purple-50 transition-all group">
        <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{event.title}</p>
          <p className="text-xs text-slate-500">
            {showDate && <span className="text-purple-600 font-medium">{dateLabel} · </span>}
            {startTime} - {endTime}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(event)}>עריכה</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(event)} className="text-red-600">
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <Card className="group hover:shadow-lg hover:scale-[1.01] transition-all duration-200 border-l-4 border-l-transparent hover:border-l-purple-400">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-900">{event.title}</h3>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {startTime} - {endTime}
              </span>
              
              {event.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
              )}
            </div>

            {event.description && (
              <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="outline" className={sourceConfig[event.source]?.color}>
                {sourceConfig[event.source]?.label}
              </Badge>

              {event.attendees?.length > 0 && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {event.attendees.length} משתתפים
                </Badge>
              )}

              {event.google_event_id && (
                <Badge variant="outline" className="flex items-center gap-1 bg-blue-50">
                  <ExternalLink className="h-3 w-3" />
                  מסונכרן
                </Badge>
              )}
            </div>
          </div>

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
              <DropdownMenuItem onClick={() => onEdit(event)}>עריכה</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(event)} className="text-red-600">
                מחק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}