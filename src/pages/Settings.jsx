import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  ArrowRight,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Settings2,
  Calendar,
  Webhook
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function Settings() {
  const [showApiKeyForm, setShowApiKeyForm] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [visibleKeys, setVisibleKeys] = React.useState({});
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['calendarConnections'],
    queryFn: () => base44.entities.CalendarConnection.list(),
  });

  const { data: webhookKeys = [] } = useQuery({
    queryKey: ['webhookKeys'],
    queryFn: () => base44.entities.WebhookKey.list(),
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

  const createKeyMutation = useMutation({
    mutationFn: (data) => base44.entities.WebhookKey.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookKeys'] });
      setShowApiKeyForm(false);
      setNewKeyName('');
      toast({ title: "מפתח API נוצר" });
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (id) => base44.entities.WebhookKey.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookKeys'] });
      toast({ title: "מפתח API נמחק" });
    }
  });

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'tk_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;
    createKeyMutation.mutate({
      name: newKeyName,
      api_key: generateApiKey(),
      is_active: true,
      permissions: ['tasks', 'events', 'calendar']
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "הועתק ללוח" });
  };

  const toggleKeyVisibility = (id) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle the redirect back from the Google OAuth flow.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    if (!status) return;

    if (status === 'connected') {
      toast({ title: "התחברת בהצלחה ל-Google Calendar", duration: 3000 });
      queryClient.invalidateQueries({ queryKey: ['calendarConnections'] });
    } else if (status === 'denied') {
      toast({ title: "החיבור בוטל", variant: "destructive", duration: 3000 });
    } else if (status === 'error') {
      toast({ title: "שגיאה בחיבור ל-Google", variant: "destructive", duration: 3000 });
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [queryClient, toast]);

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
            <TabsTrigger value="webhooks" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhooks
            </TabsTrigger>
          </TabsList>

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

          <TabsContent value="api">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>מפתחות API</CardTitle>
                    <CardDescription>מפתחות לגישה ל-Webhook API</CardDescription>
                  </div>
                  <Button onClick={() => setShowApiKeyForm(true)}>
                    <Plus className="h-4 w-4 ml-1" />
                    מפתח חדש
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {webhookKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">אין מפתחות API</p>
                    <p className="text-sm text-slate-400 mt-1">צור מפתח לגישה ל-Webhook</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>שם</TableHead>
                        <TableHead>מפתח</TableHead>
                        <TableHead>סטטוס</TableHead>
                        <TableHead>שימוש אחרון</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookKeys.map(key => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                                {visibleKeys[key.id] ? key.api_key : '••••••••••••••••'}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleKeyVisibility(key.id)}
                              >
                                {visibleKeys[key.id] ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyToClipboard(key.api_key)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={key.is_active ? "default" : "secondary"}>
                              {key.is_active ? 'פעיל' : 'מושבת'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {key.last_used_at ? (
                              format(new Date(key.last_used_at), 'dd/MM HH:mm', { locale: he })
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => {
                                if (confirm('למחוק את המפתח?')) {
                                  deleteKeyMutation.mutate(key.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-2">שימוש ב-Webhook</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    שלח בקשות POST לנקודת הקצה עם מפתח ה-API בגוף הבקשה
                  </p>
                  <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded overflow-x-auto" dir="ltr">
{`POST /functions/webhookHandler

{
  "apiKey": "YOUR_API_KEY",
  "action": "task.create",
  "payload": {
    "title": "משימה חדשה",
    "priority": "high"
  }
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl('TaskWebhook')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Webhook className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>Task Webhook</CardTitle>
                      <CardDescription>יצירת משימות דרך HTTP</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    שלח בקשות POST כדי ליצור משימות חדשות מכל מערכת חיצונית
                  </p>
                  <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); window.location.href = createPageUrl('TaskWebhook'); }}>
                    פתח דף Webhook
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => window.location.href = createPageUrl('CalendarWebhook')}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <Webhook className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle>Calendar Webhook</CardTitle>
                      <CardDescription>סנכרון אירועי יומן</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-4">
                    סנכרן אירועים מ-Google Calendar ואחזר אירועים קרובים
                  </p>
                  <Button variant="outline" className="w-full" onClick={(e) => { e.stopPropagation(); window.location.href = createPageUrl('CalendarWebhook'); }}>
                    פתח דף Webhook
                    <ArrowRight className="h-4 w-4 mr-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          </Tabs>
          </main>

      <Dialog open={showApiKeyForm} onOpenChange={setShowApiKeyForm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מפתח API חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>שם המפתח</Label>
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="לדוגמה: Production, Zapier, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyForm(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
              צור מפתח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}