const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 5);
const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY || '').trim();
const SUPABASE_WAITLIST_TABLE = (process.env.SUPABASE_WAITLIST_TABLE || 'waitlist_signups').trim();
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || 'https://sentinel-watchtower.com').trim();

const rateStore = new Map();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function logError(context, error) {
    const details = error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error };
    console.error(`[${new Date().toISOString()}] ${context}`, details);
}

function getClientIp(event) {
    const forwarded = event.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return event.headers?.['client-ip'] || 'unknown';
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

function jsonResponse(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            ...extraHeaders
        },
        body: JSON.stringify(body)
    };
}

export const handler = async (event) => {
    try {
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 204,
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: ''
            };
        }

        if (event.httpMethod !== 'POST') {
            return jsonResponse(405, { message: 'Method not allowed.' });
        }

        const ip = getClientIp(event);
        const limitCheck = checkRateLimit(ip);
        if (limitCheck.limited) {
            return jsonResponse(
                429,
                { message: 'Too many requests. Please try again later.' },
                { 'Retry-After': Math.ceil(limitCheck.retryAfterMs / 1000) }
            );
        }

        if ((event.body || '').length > 10_000) {
            return jsonResponse(413, { message: 'Payload too large.' });
        }

        let payload = {};
        try {
            payload = event.body ? JSON.parse(event.body) : {};
        } catch (_) {
            return jsonResponse(400, { message: 'Invalid request payload.' });
        }

        const email = String(payload.email || '').trim().toLowerCase();
        const city = String(payload.city || '').trim();
        const consent = payload.consent === true;
        const sourceForm = String(payload.source_form || 'unknown').trim().slice(0, 80);

        if (!email || !emailRegex.test(email)) {
            return jsonResponse(400, { message: 'Please provide a valid email address.' });
        }
        if (!consent) {
            return jsonResponse(400, { message: 'Consent is required to join the waitlist.' });
        }
        if (city.length > 80) {
            return jsonResponse(400, { message: 'City name is too long.' });
        }
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            return jsonResponse(500, { message: 'Server is not configured for waitlist signups.' });
        }

        const record = {
            email,
            city: city || null,
            consent: true,
            source_form: sourceForm,
            updated_at: new Date().toISOString()
        };

        const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_WAITLIST_TABLE}`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_SERVICE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
                Prefer: 'return=minimal'
            },
            body: JSON.stringify(record)
        });

        if (!response.ok) {
            let responseBody = '';
            try {
                responseBody = await response.text();
            } catch (_) {
                // ignore body read errors
            }
            logError('Supabase waitlist error response', {
                status: response.status,
                body: responseBody
            });
            return jsonResponse(response.status || 500, {
                message: 'Unable to join waitlist right now.'
            });
        }

        return jsonResponse(200, { ok: true });
    } catch (error) {
        logError('Unhandled waitlist handler error', error);
        return jsonResponse(500, { message: 'Something went wrong. Please try again later.' });
    }
};
