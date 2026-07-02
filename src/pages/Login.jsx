import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const redirectTo = import.meta.env.VITE_APP_URL || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md shadow-2xl border-white/40 bg-white/90 backdrop-blur-md">
        <CardHeader className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <CalendarIcon className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tasks & Calendar
          </CardTitle>
          <CardDescription>התחברות עם חשבון Gmail בלבד</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}

          <Button
            className="w-full gap-2 h-12 text-base bg-white hover:bg-slate-50 text-slate-800 border shadow-sm"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            )}
            המשך עם Google / Gmail
          </Button>

          <p className="text-center text-xs text-slate-400">
            משתמשים חדשים ימלאו שאלון קצר וימתינו לאישור מנהל
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
