import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function TaskFilters({ filters, onFiltersChange, onReset }) {
  const hasActiveFilters = filters.status !== 'all' || 
    filters.priority !== 'all' || 
    filters.search || 
    filters.dateFrom || 
    filters.dateTo;

  return (
    <div className="bg-white rounded-xl border p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter className="h-4 w-4" />
        <span>סינון</span>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onReset} className="h-6 px-2 text-xs">
            <X className="h-3 w-3 ml-1" />
            נקה הכל
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="חיפוש משימות..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pr-10"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Select
          value={filters.status}
          onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="open">פתוח</SelectItem>
            <SelectItem value="in_progress">בתהליך</SelectItem>
            <SelectItem value="done">הושלם</SelectItem>
            <SelectItem value="canceled">בוטל</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) => onFiltersChange({ ...filters, priority: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="עדיפות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל העדיפויות</SelectItem>
            <SelectItem value="low">נמוכה</SelectItem>
            <SelectItem value="medium">בינונית</SelectItem>
            <SelectItem value="high">גבוהה</SelectItem>
            <SelectItem value="urgent">דחופה</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-right">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {filters.dateFrom ? format(filters.dateFrom, 'dd/MM', { locale: he }) : 'מתאריך'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateFrom}
              onSelect={(date) => onFiltersChange({ ...filters, dateFrom: date })}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-start text-right">
              <CalendarIcon className="ml-2 h-4 w-4" />
              {filters.dateTo ? format(filters.dateTo, 'dd/MM', { locale: he }) : 'עד תאריך'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={filters.dateTo}
              onSelect={(date) => onFiltersChange({ ...filters, dateTo: date })}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}