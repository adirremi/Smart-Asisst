import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { 
  Copy,
  Webhook,
  ArrowRight,
  Calendar,
  MapPin,
  Clock,
  Key
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function CalendarWebhook() {
  const { toast } = useToast();
  
  const { data: events = [] } = useQuery({
    queryKey: ['recentEvents'],
    queryFn: () => base44.entities.CalendarEvent.list('-created_date', 20),
  });

  const webhookUrl = `${window.location.origin}/api/functions/calendarWebhook`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "הועתק ללוח" });
  };

  const sourceColors = {
    google: 'bg-blue-100 text-blue-700',
    local: 'bg-purple-100 text-purple-700',
    webhook: 'bg-pink-100 text-pink-700'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50" dir="rtl">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon" className="hover:bg-purple-50">
                  <ArrowRight className="h-5 w-5 text-purple-600" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Webhook className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Calendar Webhook
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Webhook URL */}
        <Card>
          <CardHeader>
            <CardTitle>Webhook URL</CardTitle>
            <CardDescription>נקודת קצה לסנכרון ואחזור אירועי יומן</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-slate-100 rounded-lg text-sm font-mono overflow-x-auto">
                {webhookUrl}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <CardTitle>אימות (Authentication)</CardTitle>
            </div>
            <CardDescription>השתמש ב-Basic Authentication עם הסודות הבאים</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-900">נדרשים משתני סביבה:</p>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">TASK_WEBHOOK_USERNAME</code></li>
                <li><code className="bg-amber-100 px-2 py-0.5 rounded">TASK_WEBHOOK_PASSWORD</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Request Formats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>GET - קבלת אירועים</CardTitle>
              <CardDescription>החזר אירועים קרובים</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm" dir="ltr">
{`GET ${webhookUrl}
Authorization: Basic <credentials>`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>POST - סנכרון מ-Google</CardTitle>
              <CardDescription>סנכרן אירועים מ-Google Calendar</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm" dir="ltr">
{`POST ${webhookUrl}
Authorization: Basic <credentials>
Content-Type: application/json

{}`}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>אירועים אחרונים</CardTitle>
            <CardDescription>20 האירועים האחרונים שנוצרו/סונכרנו</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p>אין אירועים עדיין</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div 
                    key={event.id}
                    className="p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-slate-900 truncate">
                            {event.title}
                          </h3>
                          <Badge className={sourceColors[event.source] || 'bg-slate-100'}>
                            {event.source}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(event.start_at), 'dd/MM/yy HH:mm', { locale: he })}
                          </span>
                          
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                            </span>
                          )}
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Toaster />
    </div>
  );
}