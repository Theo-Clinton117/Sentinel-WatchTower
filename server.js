import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = __dirname;

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 5);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const SUPABASE_WAITLIST_TABLE = (process.env.SUPABASE_WAITLIST_TABLE || 'waitlist_signups').trim();
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '*').trim();
const PORT = Number(process.env.PORT || 3000);

const rateStore = new Map();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
};

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;
    const entries = rateStore.get(ip) || [];
    const recent = entries.filter((timestamp) => timestamp > windowStart);
    if (recent.length >= RATE_LIMIT_MAX) {
        const retryAfterMs = RATE_LIMIT_WINDOW_MS - (now - recent[0]);
        return { limited: true, retryAfterMs };
    }
    recent.push(now);
    rateStore.set(ip, recent);
    return { limited: false };
}

function sendJson(res, status, payload, extraHeaders = {}) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        ...extraHeaders
    });
    res.end(JSON.stringify(payload));
}

async function readBody(req) {
    let body = '';
    for await (const chunk of req) {
        body += chunk;
        if (body.length > 10_000) {
            throw new Error('Payload too large');
        }
    }
    return body;
}

async function handleWaitlist(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { message: 'Method not allowed.' });
        return;
    }

    const ip = getClientIp(req);
    const limitCheck = checkRateLimit(ip);
    if (limitCheck.limited) {
        sendJson(
            res,
            429,
            { message: 'Too many requests. Please try again later.' },
            { 'Retry-After': Math.ceil(limitCheck.retryAfterMs / 1000) }
        );
        return;
    }

    let payload;
    try {
        const body = await readBody(req);
        payload = body ? JSON.parse(body) : {};
    } catch (error) {
        sendJson(res, 400, { message: 'Invalid request payload.' });
        return;
    }

    const email = String(payload.email || '').trim().toLowerCase();
    const city = String(payload.city || '').trim();
    const consent = payload.consent === true;
    const sourceForm = String(payload.source_form || 'unknown').trim().slice(0, 80);

    if (!email || !emailRegex.test(email)) {
        sendJson(res, 400, { message: 'Please provide a valid email address.' });
        return;
    }
    if (!consent) {
        sendJson(res, 400, { message: 'Consent is required to join the waitlist.' });
        return;
    }
    if (city.length > 80) {
        sendJson(res, 400, { message: 'City name is too long.' });
        return;
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        sendJson(res, 500, { message: 'Server is not configured for waitlist signups.' });
        return;
    }

    const record = {
        email,
        city: city || null,
        consent: true,
        source_form: sourceForm,
        updated_at: new Date().toISOString()
    };

    try {
        const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_WAITLIST_TABLE}`;
        const supabaseResponse = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                Prefer: 'return=minimal'
            },
            body: JSON.stringify(record)
        });

        if (!supabaseResponse.ok) {
            let message = 'Unable to join waitlist right now.';
            try {
                const err = await supabaseResponse.json();
                if (supabaseResponse.status === 409 || err?.code === '23505') {
                    message = 'This email is already on the waitlist.';
                } else if (err?.message) {
                    message = err.message;
                }
            } catch (_) {
                // ignore JSON parse errors
            }
            sendJson(res, supabaseResponse.status || 500, { message });
            return;
        }

        sendJson(res, 200, { ok: true });
    } catch (error) {
        sendJson(res, 500, { message: 'Unexpected server error.' });
    }
}

async function handleStatic(req, res) {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(requestUrl.pathname);

    if (pathname === '/') {
        pathname = '/index.html';
    }

    const filePath = path.normalize(path.join(publicDir, pathname));
    if (!filePath.startsWith(publicDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    try {
        const data = await readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
        res.end(data);
    } catch (_) {
        res.writeHead(404);
        res.end('Not found');
    }
}

const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith('/api/waitlist')) {
        await handleWaitlist(req, res);
        return;
    }
    await handleStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
