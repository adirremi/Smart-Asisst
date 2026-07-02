// Drop-in replacement for the old Base44 SDK client.
// It exposes the same surface the app already uses:
//   base44.entities.<Entity>.list / filter / create / update / delete
//   base44.auth.me / logout / redirectToLogin
//   base44.functions.invoke
//   base44.appLogs.logUserInApp
// ...but everything is backed by Supabase (DB + auth) and Vercel serverless
// functions instead of Base44.

import { supabase } from '@/lib/supabase';

// Map the old "entity" names to Postgres table names.
const TABLES = {
  Task: 'tasks',
  CalendarEvent: 'calendar_events',
  CalendarConnection: 'calendar_connections',
  WebhookKey: 'webhook_keys',
  TaskWebhookLog: 'task_webhook_logs',
};

// Fields that are managed by the database / RLS and must never be written back.
const READONLY_FIELDS = ['id', 'user_id', 'created_by', 'created_date', 'updated_date'];

function sanitize(data) {
  const clean = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (READONLY_FIELDS.includes(key)) continue;
    if (value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

// Base44 sort strings: "field" (asc) or "-field" (desc).
function applySort(query, sort) {
  if (!sort) {
    return query.order('created_date', { ascending: false });
  }
  const desc = sort.startsWith('-');
  const column = desc ? sort.slice(1) : sort;
  return query.order(column, { ascending: !desc });
}

function createEntity(entityName) {
  const table = TABLES[entityName];

  return {
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async filter(criteria = {}, sort, limit) {
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(criteria)) {
        query = query.eq(key, value);
      }
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table)
        .insert(sanitize(payload))
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table)
        .update(sanitize(payload))
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },
  };
}

const entities = Object.fromEntries(
  Object.keys(TABLES).map((name) => [name, createEntity(name)])
);

function mapUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    email: user.email,
    full_name: meta.full_name || meta.name || user.email,
    ...meta,
  };
}

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    return mapUser(data.user);
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else {
      window.location.href = '/';
    }
  },

  redirectToLogin() {
    window.location.href = '/';
  },
};

const functions = {
  async invoke(name, body = {}) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(`/api/functions/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      // non-JSON response
    }

    if (!res.ok) {
      const err = new Error(data.error || data.details || `Function ${name} failed`);
      err.response = { data };
      err.status = res.status;
      throw err;
    }

    return { data };
  },
};

// The old app logged page views to Base44. Kept as a no-op so callers don't break.
const appLogs = {
  async logUserInApp() {
    return true;
  },
};

export const base44 = { entities, auth, functions, appLogs };
