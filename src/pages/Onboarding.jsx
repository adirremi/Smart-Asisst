import React, { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES, US_STATES, resolveTimezone, formatTimezoneLabel } from '@/lib/locations';
import { Loader2, UserPlus } from 'lucide-react';

export default function Onboarding({ onComplete }) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('IL');
  const [stateCode, setStateCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timezone = useMemo(
    () => resolveTimezone(country, stateCode),
    [country, stateCode]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('נא להזין שם מלא');
      return;
    }
    if (!phone.trim() || phone.trim().length < 9) {
      setError('נא להזין מספר טלפון תקין');
      return;
    }
    if (country === 'US' && !stateCode) {
      setError('נא לבחור מדינה (State) בארה"ב');
      return;
    }

    setLoading(true);
    try {
      const profile = {
        user_id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        phone: phone.trim(),
        country,
        state_code: country === 'US' ? stateCode : null,
        timezone,
        status: 'pending',
      };

      const { error: insertError } = await supabase.from('user_profiles').insert(profile);
      if (insertError) throw insertError;

      // Notify admin via WhatsApp (serverless function).
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await fetch('/api/notify/new-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(profile),
      });

      onComplete?.();
    } catch (err) {
      setError(err.message || 'שגיאה בשמירת הפרטים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4"
      dir="rtl"
    >
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-2">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <CardTitle>ברוך הבא! שאלון הרשמה</CardTitle>
          <CardDescription>מלא את הפרטים כדי להשלים את ההרשמה. החשבון יופעל לאחר אישור מנהל.</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="השם שלך"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">מספר טלפון *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                dir="ltr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>מדינה *</Label>
              <Select
                value={country}
                onValueChange={(v) => {
                  setCountry(v);
                  setStateCode('');
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

            {country === 'US' && (
              <div className="space-y-2">
                <Label>מדינה (State) *</Label>
                <Select value={stateCode} onValueChange={setStateCode}>
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
              <Label>אזור זמן מקומי</Label>
              <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border" dir="ltr">
                {formatTimezoneLabel(timezone)}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              שלח לאישור מנהל
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
