const { put, del } = require('@vercel/blob');

// NOTE: Vercel Functions have a 4.5 MB request body limit, so this simple
// server-side upload comfortably handles guest voice clips and reasonably
// compressed background music, but will reject anything larger. If you need
// to support bigger files (e.g. an uncompressed multi-minute song), the fix
// is to switch to direct client-to-Blob uploads instead of this route.

function getKey(req) {
  const url = new URL(req.url, 'http://localhost');
  return url.searchParams.get('key');
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const key = getKey(req);
      if (!key) {
        res.status(400).json({ error: 'Missing "key" query parameter' });
        return;
      }

      const buffer = await readRawBody(req);
      if (buffer.length === 0) {
        res.status(400).json({ error: 'Empty upload' });
        return;
      }
      if (buffer.length > 4.5 * 1024 * 1024) {
        res.status(413).json({ error: 'File too large for server upload (4.5MB limit). Compress the file or ask for the client-upload version.' });
        return;
      }

      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const blob = await put(`lamp-ceremony/audio/${key}`, buffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        cacheControlMaxAge: 60
      });

      res.status(200).json({ url: blob.url });
      return;
    }

    if (req.method === 'DELETE') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      const url = body && body.url;
      if (url) {
        try { await del(url); } catch (e) { /* already gone \u2014 fine */ }
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'POST, DELETE');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('api/upload error:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
};
