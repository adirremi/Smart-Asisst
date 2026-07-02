import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

export default function Login() {
  const [mode, setMode] = useState('signin'); // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email } },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setInfo('נשלח אליך מייל אימות. אשר אותו כדי להתחבר.');
        }
      }
    } catch (err) {
      setError(err.message || 'אירעה שגיאה');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
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
          <CardDescription>
            {mode === 'signin' ? 'התחבר כדי להמשיך' : 'צור חשבון חדש'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="fullName">שם מלא</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="השם שלך"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                {info}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              {mode === 'signin' ? 'התחבר' : 'הרשמה'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">או</span>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleGoogleLogin} type="button">
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            המשך עם Google
          </Button>

          <p className="text-center text-sm text-slate-500">
            {mode === 'signin' ? 'אין לך חשבון?' : 'כבר יש לך חשבון?'}{' '}
            <button
              type="button"
              className="text-blue-600 font-medium hover:underline"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setInfo(null);
              }}
            >
              {mode === 'signin' ? 'הרשמה' : 'התחברות'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
