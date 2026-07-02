import { serviceClient, readJsonBody } from '../_lib/supabase.js';

function decodeBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return null;
  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
  const idx = credentials.indexOf(':');
  return { username: credentials.slice(0, idx), password: credentials.slice(idx + 1) };
}

function checkAuth(req) {
  const credentials = decodeBasicAuth(req.headers.authorization || req.headers.Authorization);
  const expectedUsername = process.env.TASK_WEBHOOK_USERNAME;
  const expectedPassword = process.env.TASK_WEBHOOK_PASSWORD;
  return (
    credentials &&
    credentials.username === expectedUsername &&
    credentials.password === expectedPassword
  );
}

// The rows created via webhook belong to this user (webhooks are global, not per-user).
const OWNER_ID = process.env.WEBHOOK_OWNER_USER_ID;
const OWNER_EMAIL = process.env.WEBHOOK_OWNER_EMAIL;

export default async function handler(req, res) {
  try {
    if (!checkAuth(req)) {
      res.status(401).json({ error: 'Unauthorized - Invalid credentials' });
      return;
    }

    const supabase = serviceClient();

    if (req.method === 'GET') {
      const query = supabase.from('tasks').select('*');
      if (OWNER_ID) query.eq('user_id', OWNER_ID);
      const { data: tasks, error } = await query;
      if (error) throw error;
      res.status(200).json({ tasks: tasks || [] });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const receivedAt = new Date().toISOString();

      const { data: log } = await supabase
        .from('task_webhook_logs')
        .insert({
          user_id: OWNER_ID || null,
          created_by: OWNER_EMAIL || null,
          received_at: receivedAt,
          raw_data: JSON.stringify(body),
          title: body.title || '',
          status: 'failed',
        })
        .select()
        .single();

      if (!body.title) {
        if (log) {
          await supabase
            .from('task_webhook_logs')
            .update({ error_message: 'Missing required field: title' })
            .eq('id', log.id);
        }
        res.status(400).json({ error: 'Missing required field: title' });
        return;
      }

      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: OWNER_ID || null,
          created_by: OWNER_EMAIL || null,
          title: body.title,
          description: body.description || '',
          status: 'open',
          priority: body.priority || 'medium',
          due_at: body.due_at || null,
          tags: body.tags || [],
          external_source: 'webhook',
          external_id: body.external_id || null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      if (log) {
        await supabase
          .from('task_webhook_logs')
          .update({ status: 'success', task_id: task.id })
          .eq('id', log.id);
      }

      res.status(200).json({ success: true, taskId: task.id, message: 'Task created successfully' });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
}
