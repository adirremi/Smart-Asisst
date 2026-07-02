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
import { CheckCircle2, XCircle, RefreshCw, Shield, Clock } from 'lucide-react';
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
