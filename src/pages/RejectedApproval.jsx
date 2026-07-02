import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { XCircle, LogOut } from 'lucide-react';

export default function RejectedApproval() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-slate-50 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <CardTitle>הבקשה לא אושרה</CardTitle>
          <CardDescription>החשבון שלך לא אושר על ידי המנהל. לפרטים נוספים צור קשר.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button variant="outline" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            יציאה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
