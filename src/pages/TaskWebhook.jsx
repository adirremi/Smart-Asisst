import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Copy,
  Webhook,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Key
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function TaskWebhook() {
  const { toast } = useToast();
  
  const { data: logs = [] } = useQuery({
    queryKey: ['taskWebhookLogs'],
    queryFn: () => base44.entities.TaskWebhookLog.list('-received_at', 50),
  });

  const webhookUrl = `${window.location.origin}/api/functions/taskWebhook`;

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "הועתק ללוח" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" dir="rtl">
      <header className="bg-white/90 backdrop-blur-md border-b border-white/20 sticky top-0 z-40 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon" className="hover:bg-blue-50">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                </Button>
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Webhook className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Task Webhook
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
            <CardDescription>שלח בקשות POST ל-URL זה ליצירת משימות חדשות</CardDescription>
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

        {/* Request Format */}
        <Card>
          <CardHeader>
            <CardTitle>פורמט בקשה (POST)</CardTitle>
            <CardDescription>גוף הבקשה צריך להיות JSON</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-sm" dir="ltr">
{`POST ${webhookUrl}
Authorization: Basic <credentials>
Content-Type: application/json

{
  "title": "Task title here",
  "description": "Optional description",
  "priority": "high",
  "due_at": "2026-01-10T10:00:00Z",
  "tags": ["tag1", "tag2"]
}`}
            </pre>
          </CardContent>
        </Card>

        {/* Webhook Logs */}
        <Card>
          <CardHeader>
            <CardTitle>יומן Webhook</CardTitle>
            <CardDescription>50 הבקשות האחרונות</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Webhook className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                <p>אין בקשות עדיין</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>תאריך</TableHead>
                      <TableHead>כותרת</TableHead>
                      <TableHead>שגיאה</TableHead>
                      <TableHead>Task ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="h-3 w-3 ml-1" />
                              הצלחה
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 ml-1" />
                              כשלון
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(log.received_at), 'dd/MM/yy HH:mm', { locale: he })}
                        </TableCell>
                        <TableCell className="font-medium">{log.title || '-'}</TableCell>
                        <TableCell className="text-sm text-red-600">
                          {log.error_message || '-'}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.task_id || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Toaster />
    </div>
  );
}