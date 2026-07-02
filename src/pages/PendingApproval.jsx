import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, LogOut } from 'lucide-react';

export default function PendingApproval({ profile }) {
  const { logout } = useAuth();

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-2">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle>ממתין לאישור מנהל</CardTitle>
          <CardDescription>
            שלום {profile?.full_name}, קיבלנו את הפרטים שלך. תקבל גישה לאפליקציה לאחר אישור.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 text-right space-y-1">
            <p><strong>טלפון:</strong> {profile?.phone}</p>
            <p><strong>אזור זמן:</strong> <span dir="ltr">{profile?.timezone}</span></p>
            <p><strong>סטטוס:</strong> ממתין לאישור</p>
          </div>
          <p className="text-xs text-slate-400">נשלחה הודעה למנהל. נודיע לך כשהחשבון יאושר.</p>
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            יציאה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
