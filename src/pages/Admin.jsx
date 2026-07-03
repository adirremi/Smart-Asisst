import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, RefreshCw, Shield, Clock, Bell, Play, Send } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { TIMEZONE_OPTIONS } from '@/lib/locations';

async function adminFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default function Admin() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['adminPendingUsers'],
    queryFn: () => adminFetch('/api/admin/users?status=pending'),
    refetchInterval: 30000,
  });

  const users = data?.users || [];

  const mutation = useMutation({
    mutationFn: ({ userId, status }) =>
      adminFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ userId, status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPendingUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminApprovedUsers'] });
    },
  });

  const { data: approvedData } = useQuery({
    queryKey: ['adminApprovedUsers'],
    queryFn: () => adminFetch('/api/admin/users?status=approved'),
  });
  const approvedUsers = approvedData?.users || [];

  const tzMutation = useMutation({
    mutationFn: ({ userId, timezone }) =>
      adminFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'set_timezone', userId, timezone }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminApprovedUsers'] }),
  });

  const { data: reminderStatus, refetch: refetchReminders, isFetching: remindersFetching } = useQuery({
    queryKey: ['adminReminders'],
    queryFn: () => adminFetch('/api/admin/reminders'),
    refetchInterval: 60000,
  });

  const reminderMutation = useMutation({
    mutationFn: (body) =>
      adminFetch('/api/admin/reminders', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminReminders'] }),
  });

  const EnvOk = ({ ok, label }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
      <span className={ok ? 'text-green-800' : 'text-red-700'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">ניהול לקוחות</h1>
              <p className="text-sm text-slate-500">אישור לקוחות חדשים</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 ml-1 ${isFetching ? 'animate-spin' : ''}`} />
            רענן
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>ממתינים לאישור ({users.length})</CardTitle>
            <CardDescription>לקוחות שמילאו שאלון ומחכים לאישור שלך</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-slate-500 py-8">טוען...</p>
            ) : users.length === 0 ? (
              <p className="text-center text-slate-500 py-8">אין לקוחות ממתינים 🎉</p>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <div key={u.id} className="border rounded-xl p-4 bg-white space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{u.full_name}</h3>
                        <p className="text-sm text-slate-500">{u.email}</p>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700">
                        ממתין
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p><strong>טלפון:</strong> {u.phone}</p>
                      <p><strong>מדינה:</strong> {u.country}{u.state_code ? ` / ${u.state_code}` : ''}</p>
                      <p dir="ltr"><strong>TZ:</strong> {u.timezone}</p>
                      <p>
                        <strong>נרשם:</strong>{' '}
                        {format(new Date(u.created_date), 'dd/MM/yy HH:mm', { locale: he })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-1"
                        onClick={() => mutation.mutate({ userId: u.user_id, status: 'approved' })}
                        disabled={mutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        אשר
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1"
                        onClick={() => mutation.mutate({ userId: u.user_id, status: 'rejected' })}
                        disabled={mutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        דחה
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  תזכורות WhatsApp יומיות
                </CardTitle>
                <CardDescription>
                  בקרה על ה-cron: משימות ב-{reminderStatus?.config?.tasksTime || '08:45'}, אירועים ב-
                  {reminderStatus?.config?.eventsTime || '20:15'} (שעון מקומי לכל לקוח)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchReminders()}
                  disabled={remindersFetching}
                >
                  <RefreshCw className={`h-4 w-4 ml-1 ${remindersFetching ? 'animate-spin' : ''}`} />
                  רענן
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  onClick={() => reminderMutation.mutate({ action: 'run_cron' })}
                  disabled={reminderMutation.isPending}
                >
                  <Play className="h-4 w-4" />
                  הרץ cron עכשיו
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!reminderStatus ? (
              <p className="text-center text-slate-500 py-4">טוען סטטוס תזכורות...</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border">
                  <EnvOk ok={reminderStatus.env?.wasenderSet} label="Wasender API מוגדר" />
                  <EnvOk ok={reminderStatus.env?.cronSecretSet} label="CRON_SECRET מוגדר" />
                  <EnvOk
                    ok={reminderStatus.env?.reminderTableOk}
                    label={
                      reminderStatus.env?.reminderTableOk
                        ? 'טבלת reminder_sent קיימת'
                        : `טבלת reminder_sent חסרה — הרץ reminder_sent.sql`
                    }
                  />
                  <div className="text-sm text-slate-600">
                    <strong>Cron:</strong> {reminderStatus.config?.path} ·{' '}
                    {reminderStatus.config?.ticksPerDay} ריצות/יום
                  </div>
                </div>

                {reminderMutation.isSuccess && reminderMutation.data && (
                  <div className="text-sm p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">
                    הרצה אחרונה: נשלחו {reminderMutation.data.tasks} משימות,{' '}
                    {reminderMutation.data.events} אירועים · נבדקו {reminderMutation.data.checked} לקוחות
                    {reminderMutation.data.skipped > 0 && ` · דולגו ${reminderMutation.data.skipped} (כבר נשלח היום)`}
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-slate-700">סטטוס לקוחות היום</h3>
                  {reminderStatus.users?.length === 0 ? (
                    <p className="text-sm text-slate-500">אין לקוחות מאושרים</p>
                  ) : (
                    <div className="space-y-2">
                      {reminderStatus.users.map((u) => (
                        <div
                          key={u.user_id}
                          className="border rounded-xl p-3 bg-white text-sm space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium">{u.full_name}</p>
                              <p className="text-xs text-slate-500" dir="ltr">
                                {u.localTime} · {u.timezone}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                title="שלח תזכורת משימות עכשיו (בדיקה)"
                                disabled={reminderMutation.isPending || !u.canReceiveTasks}
                                onClick={() =>
                                  reminderMutation.mutate({
                                    action: 'test_send',
                                    userId: u.user_id,
                                    kind: 'tasks',
                                  })
                                }
                              >
                                <Send className="h-3 w-3 ml-1" />
                                משימות
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                title="שלח תזכורת אירועים עכשיו (בדיקה)"
                                disabled={reminderMutation.isPending || !u.canReceiveEvents}
                                onClick={() =>
                                  reminderMutation.mutate({
                                    action: 'test_send',
                                    userId: u.user_id,
                                    kind: 'events',
                                  })
                                }
                              >
                                <Send className="h-3 w-3 ml-1" />
                                אירועים
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span>
                              משימות ({u.openTasks}):{' '}
                              {u.tasksSentToday ? (
                                <span className="text-green-700">✓ נשלח היום</span>
                              ) : u.canReceiveTasks ? (
                                <span className="text-amber-700">ממתין ל-08:45</span>
                              ) : (
                                <span className="text-slate-400">אין משימות / חסר טלפון</span>
                              )}
                            </span>
                            <span>
                              אירועים ({u.upcomingEvents}):{' '}
                              {u.eventsSentToday ? (
                                <span className="text-green-700">✓ נשלח היום</span>
                              ) : u.canReceiveEvents ? (
                                <span className="text-amber-700">ממתין ל-20:15</span>
                              ) : (
                                <span className="text-slate-400">אין אירועים / חסר טלפון</span>
                              )}
                            </span>
                            {u.inTasksWindow && (
                              <span className="col-span-2 text-blue-700">⏱ עכשיו בחלון שליחת משימות (08:45)</span>
                            )}
                            {u.inEventsWindow && (
                              <span className="col-span-2 text-blue-700">⏱ עכשיו בחלון שליחת אירועים (20:15)</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {reminderStatus.recent?.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-slate-700">שליחות אחרונות</h3>
                    <div className="border rounded-xl overflow-hidden text-xs">
                      {reminderStatus.recent.slice(0, 10).map((row, i) => (
                        <div
                          key={`${row.user_id}-${row.kind}-${row.local_date}-${i}`}
                          className="flex justify-between gap-2 px-3 py-2 border-b last:border-0 bg-white"
                        >
                          <span>
                            {row.full_name} · {row.kind === 'tasks' ? 'משימות' : 'אירועים'} · {row.local_date}
                          </span>
                          <span className="text-slate-500 shrink-0" dir="ltr">
                            {format(new Date(row.sent_at), 'dd/MM HH:mm')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              אזורי זמן של לקוחות ({approvedUsers.length})
            </CardTitle>
            <CardDescription>
              תקן את אזור הזמן המקומי של לקוח מאושר. הזמנים ביומן ובתזכורות מחושבים לפיו.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {approvedUsers.length === 0 ? (
              <p className="text-center text-slate-500 py-6">אין לקוחות מאושרים עדיין</p>
            ) : (
              <div className="space-y-3">
                {approvedUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 border rounded-xl p-3 bg-white"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{u.phone}</p>
                    </div>
                    <div className="w-56 shrink-0">
                      <Select
                        value={u.timezone || ''}
                        onValueChange={(tz) => tzMutation.mutate({ userId: u.user_id, timezone: tz })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר אזור זמן" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((o) => (
                            <SelectItem key={o.tz} value={o.tz}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
