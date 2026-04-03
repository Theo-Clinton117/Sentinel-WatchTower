import { getCrimeNews } from './_lib/crime-news.js';

const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || 'https://sentinel-watchtower.com').trim();

function jsonResponse(statusCode, body, extraHeaders = {}) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: ''
            };
        }

        if (event.httpMethod !== 'GET') {
            return jsonResponse(405, { message: 'Method not allowed.' });
        }

        const payload = await getCrimeNews();
        return jsonResponse(200, payload, {
            'Cache-Control': 'public, max-age=300'
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Crime news handler error`, error);
        return jsonResponse(500, {
            message: 'Unable to load live crime news right now.'
        });
    }
};
