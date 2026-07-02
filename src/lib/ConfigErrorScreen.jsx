import React from 'react';

export function ConfigErrorScreen({ message }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
      }}
      dir="rtl"
    >
      <div
        style={{
          maxWidth: 520,
          background: 'white',
          border: '1px solid #fecaca',
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h1 style={{ margin: '0 0 12px', color: '#b91c1c', fontSize: 20 }}>שגיאת הגדרה</h1>
        <p style={{ margin: 0, color: '#334155', lineHeight: 1.6 }}>{message}</p>
        <p style={{ margin: '16px 0 0', color: '#64748b', fontSize: 14 }}>
          ב-Vercel: Settings → Environment Variables → ודא ש-VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY
          מוגדרים ל-Production, ואז Deployments → Redeploy.
        </p>
      </div>
    </div>
  );
}
