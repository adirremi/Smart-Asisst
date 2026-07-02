import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { COUNTRIES, US_STATES, resolveTimezone, formatTimezoneLabel } from '@/lib/locations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Home,
  Clock,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Settings() {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [finishingConnect, setFinishingConnect] = React.useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, refreshProfile } = useProfile(user?.id);

  // Local timezone editor state (for users who picked the wrong region).
  const [tzCountry, setTzCountry] = useState('IL');
  const [tzState, setTzState] = useState('');
  const [savingTz, setSavingTz] = useState(false);

  useEffect(() => {
    if (profile) {
      setTzCountry(profile.country || 'IL');
      setTzState(profile.state_code || '');
    }
  }, [profile]);

  const resolvedTz = resolveTimezone(tzCountry, tzState);

  const handleSaveTimezone = async () => {
    if (!user?.id) return;
    if (tzCountry === 'US' && !tzState) {
      toast({ title: 'נא לבחור מדינה (State)', variant: 'destructive' });
      return;
    }
    setSavingTz(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          country: tzCountry,
          state_code: tzCountry === 'US' ? tzState : null,
          timezone: resolvedTz,
        })
        .eq('user_id', user.id);
      if (error) throw error;
      refreshProfile();
      toast({ title: 'אזור הזמן עודכן', description: formatTimezoneLabel(resolvedTz) });
    } catch (err) {
      toast({ title: 'שגיאה בעדכון אזור הזמן', description: err.message, variant: 'destructive' });
    } finally {
      setSavingTz(false);
    }
  };

  const { data: connections = [] } = useQuery({
    queryKey: ['calendarConnections'],
    queryFn: () => base44.entities.CalendarConnection.list(),
  });

  const connection = connections[0];

  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarConnection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
      toast({ title: "הגדרות עודכנו" });
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
      toast({ title: "חיבור Google Calendar בוטל" });
    }
  });

  // Handle the redirect back from the Google OAuth flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;

    // Clear the query param so a refresh doesn't re-trigger this.
    window.history.replaceState({}, document.title, window.location.pathname);

    if (status === 'connected') {
      toast({ title: "התחברת בהצלחה ל-Google Calendar", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });

      // Auto-sync, then move the user to the main page.
      setFinishingConnect(true);
      base44.functions
        .invoke('syncGoogleCalendar', {})
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['events'] });
          toast({ title: "הסנכרון הושלם! מעביר אותך לעמוד הראשי", duration: 2500 });
        })
        .catch(() => {})
        .finally(() => {
          setTimeout(() => navigate(createPageUrl('Dashboard')), 1200);
        });
    } else if (status === 'denied') {
      toast({ title: "החיבור בוטל", variant: "destructive", duration: 3000 });
    } else if (status === 'error') {
      toast({ title: "שגיאה בחיבור ל-Google", variant: "destructive", duration: 3000 });
    }
  }, [queryClient, toast, navigate]);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "עליך להתחבר תחילה", variant: "destructive" });
        setIsConnecting(false);
        return;
      }
      // Top-level redirect to start the Google OAuth consent flow.
      window.location.href = `/api/auth/google/start?access_token=${encodeURIComponent(session.access_token)}`;
    } catch (error) {
      toast({
        title: "שגיאה בחיבור",
        description: error.message,
        variant: "destructive",
        duration: 3000
      });
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data } = await base44.functions.invoke('syncGoogleCalendar', {});
      if (data.success) {
        toast({ 
          title: "סנכרון הושלם!",
          description: data.message,
          duration: 3000
        });
        queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
      }
    } catch (error) {
      toast({ 
        title: "שגיאה בסנכרון",
        description: error.response?.data?.details || error.message,
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      {finishingConnect && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-purple-600" />
          <p className="mt-4 font-medium text-slate-700">מסנכרן את היומן שלך...</p>
          <p className="text-sm text-slate-500">עוד רגע נעביר אותך לעמוד הראשי</p>
        </div>
      )}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon">
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-slate-900">הגדרות</h1>
            </div>
            <Link to={createPageUrl("Dashboard")}>
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">לעמוד הראשי</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="integrations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="integrations" className="gap-2">
              <Calendar className="h-4 w-4" />
              אינטגרציות
            </TabsTrigger>
            <TabsTrigger value="general" className="gap-2">
              <Clock className="h-4 w-4" />
              כללי
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>אזור זמן מקומי</CardTitle>
                    <CardDescription>עדכן את המדינה כדי לתקן את השעון המקומי שלך</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>מדינה</Label>
                  <Select
                    value={tzCountry}
                    onValueChange={(v) => {
                      setTzCountry(v);
                      setTzState('');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {tzCountry === 'US' && (
                  <div className="space-y-2">
                    <Label>מדינה (State)</Label>
                    <Select value={tzState} onValueChange={setTzState}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר מדינה" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>אזור הזמן שייקבע</Label>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border" dir="ltr">
                    {formatTimezoneLabel(resolvedTz)}
                  </div>
                  <p className="text-xs text-slate-500">
                    התזכורות היומיות והאירועים מחושבים לפי אזור הזמן הזה.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveTimezone} disabled={savingTz} className="gap-2">
                  {savingTz && <Loader2 className="h-4 w-4 animate-spin" />}
                  שמור אזור זמן
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <img 
                    src="https://www.google.com/favicon.ico" 
                    alt="Google" 
                    className="w-8 h-8"
                  />
                  <div>
                    <CardTitle>Google Calendar</CardTitle>
                    <CardDescription>סנכרן אירועים עם Google Calendar</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {connection ? (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-green-800">מחובר</p>
                        <p className="text-sm text-green-600">{connection.connected_email}</p>
                      </div>
                      <Badge variant="outline" className="bg-white">
                        {connection.default_calendar_id === 'primary' ? 'יומן ראשי' : connection.default_calendar_id}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>סנכרון פעיל</Label>
                          <p className="text-sm text-slate-500">משוך אירועים מ-Google Calendar</p>
                        </div>
                        <Switch
                          checked={connection.sync_enabled}
                          onCheckedChange={(checked) => 
                            updateConnectionMutation.mutate({ 
                              id: connection.id, 
                              data: { ...connection, sync_enabled: checked } 
                            })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>סנכרון דו-כיווני</Label>
                          <p className="text-sm text-slate-500">שלח אירועים חדשים ל-Google Calendar</p>
                        </div>
                        <Switch
                          checked={connection.two_way_sync}
                          onCheckedChange={(checked) => 
                            updateConnectionMutation.mutate({ 
                              id: connection.id, 
                              data: { ...connection, two_way_sync: checked } 
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>מזהה יומן</Label>
                        <Input
                          value={connection.default_calendar_id}
                          onChange={(e) => 
                            updateConnectionMutation.mutate({ 
                              id: connection.id, 
                              data: { ...connection, default_calendar_id: e.target.value } 
                            })
                          }
                          placeholder="primary"
                        />
                        <p className="text-xs text-slate-500">השאר "primary" ליומן הראשי</p>
                      </div>

                      {connection.last_sync_at && (
                        <p className="text-sm text-slate-500">
                          סנכרון אחרון: {format(new Date(connection.last_sync_at), 'PPp', { locale: he })}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                    <XCircle className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="font-medium text-slate-700">לא מחובר</p>
                      <p className="text-sm text-slate-500">חבר את חשבון Google שלך לסנכרון אירועים</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {connection ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      {isSyncing ? 'מסנכרן...' : 'סנכרן עכשיו'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-red-600"
                      onClick={() => {
                        if (confirm('לנתק את חיבור Google Calendar?')) {
                          deleteConnectionMutation.mutate(connection.id);
                        }
                      }}
                    >
                      נתק חיבור
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="gap-2"
                    onClick={handleConnectGoogle}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        מתחבר...
                      </>
                    ) : (
                      <>
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                        חבר Google Calendar
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          </Tabs>
          </main>

      <Toaster />
    </div>
  );
}