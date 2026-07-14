import { put, list } from '@vercel/blob';

const STATE_PATHNAME = 'lamp-ceremony/state.json';

const DEFAULT_STATE = {
  idMap: {},
  lampToId: {},
  guests: {},
  bgmUrl: null
};

async function readState() {
  try {
    const { blobs } = await list({ prefix: STATE_PATHNAME, limit: 1 });
    const match = blobs.find((b) => b.pathname === STATE_PATHNAME);
    
    // If no file exists, return defaults
    if (!match) {
      console.log('No existing state file found, using defaults');
      return DEFAULT_STATE;
    }

    const res = await fetch(match.url, { cache: 'no-store' });
    if (!res.ok) {
      console.log(`Failed to fetch state: ${res.status}, using defaults`);
      return DEFAULT_STATE;
    }

    const data = await res.json();
    return Object.assign({}, DEFAULT_STATE, data);
  } catch (err) {
    console.error('Error reading state:', err);
    return DEFAULT_STATE;
  }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const state = await readState();
      res.status(200).json(state);
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      const next = Object.assign({}, DEFAULT_STATE, body || {});

      await put(STATE_PATHNAME, JSON.stringify(next), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        cacheControlMaxAge: 60
      });

      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('api/state error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
}