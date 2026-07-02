import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, Plus, MapPin, Users } from "lucide-react";
import { format, setHours, setMinutes } from "date-fns";
import { he } from "date-fns/locale";

const defaultEvent = {
  title: '',
  description: '',
  start_at: new Date(),
  end_at: new Date(),
  location: '',
  attendees: [],
  source: 'local',
  all_day: false
};

export default function EventForm({ open, onOpenChange, event, onSave, isLoading, isGoogleConnected }) {
  const [formData, setFormData] = React.useState(defaultEvent);
  const [newAttendee, setNewAttendee] = React.useState('');
  const [syncToGoogle, setSyncToGoogle] = React.useState(true);

  React.useEffect(() => {
    if (event) {
      setFormData({
        ...defaultEvent,
        ...event,
        start_at: new Date(event.start_at),
        end_at: new Date(event.end_at)
      });
      setSyncToGoogle(event.source === 'google');
    } else {
      const now = new Date();
      const start = setMinutes(setHours(now, now.getHours() + 1), 0);
      const end = setMinutes(setHours(now, now.getHours() + 2), 0);
      setFormData({ ...defaultEvent, start_at: start, end_at: end });
      setSyncToGoogle(isGoogleConnected);
    }
  }, [event, open, isGoogleConnected]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      start_at: formData.start_at.toISOString(),
      end_at: formData.end_at.toISOString(),
      source: syncToGoogle && isGoogleConnected ? 'google' : 'local'
    });
  };

  const addAttendee = () => {
    if (newAttendee.trim() && newAttendee.includes('@') && !formData.attendees.includes(newAttendee.trim())) {
      setFormData({ ...formData, attendees: [...formData.attendees, newAttendee.trim()] });
      setNewAttendee('');
    }
  };

  const removeAttendee = (email) => {
    setFormData({ 
      ...formData, 
      attendees: formData.attendees.filter(a => a !== email) 
    });
  };

  const updateTime = (field, hours, minutes) => {
    const newDate = new Date(formData[field]);
    newDate.setHours(parseInt(hours));
    newDate.setMinutes(parseInt(minutes));
    setFormData({ ...formData, [field]: newDate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>{event ? 'עריכת אירוע' : 'אירוע חדש'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">כותרת *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="שם האירוע"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">תיאור</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="פרטים נוספים..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>תאריך התחלה</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(formData.start_at, 'dd/MM/yy', { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.start_at}
                    onSelect={(date) => {
                      if (date) {
                        const newStart = new Date(date);
                        newStart.setHours(formData.start_at.getHours());
                        newStart.setMinutes(formData.start_at.getMinutes());
                        setFormData({ ...formData, start_at: newStart });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>שעת התחלה</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.start_at.getHours().toString().padStart(2, '0')}
                  onValueChange={(h) => updateTime('start_at', h, formData.start_at.getMinutes())}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                        {i.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select
                  value={formData.start_at.getMinutes().toString().padStart(2, '0')}
                  onValueChange={(m) => updateTime('start_at', formData.start_at.getHours(), m)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>תאריך סיום</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {format(formData.end_at, 'dd/MM/yy', { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.end_at}
                    onSelect={(date) => {
                      if (date) {
                        const newEnd = new Date(date);
                        newEnd.setHours(formData.end_at.getHours());
                        newEnd.setMinutes(formData.end_at.getMinutes());
                        setFormData({ ...formData, end_at: newEnd });
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>שעת סיום</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.end_at.getHours().toString().padStart(2, '0')}
                  onValueChange={(h) => updateTime('end_at', h, formData.end_at.getMinutes())}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                        {i.toString().padStart(2, '0')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="self-center">:</span>
                <Select
                  value={formData.end_at.getMinutes().toString().padStart(2, '0')}
                  onValueChange={(m) => updateTime('end_at', formData.end_at.getHours(), m)}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>מיקום</Label>
            <div className="relative">
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="הוסף מיקום"
                className="pr-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>משתתפים</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={newAttendee}
                  onChange={(e) => setNewAttendee(e.target.value)}
                  placeholder="הוסף אימייל"
                  className="pr-10"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttendee())}
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={addAttendee}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.attendees.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-full text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {isGoogleConnected && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                <span className="text-sm font-medium">סנכרן ל-Google Calendar</span>
              </div>
              <Switch
                checked={syncToGoogle}
                onCheckedChange={setSyncToGoogle}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isLoading || !formData.title}>
              {isLoading ? 'שומר...' : event ? 'עדכן' : 'צור אירוע'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}