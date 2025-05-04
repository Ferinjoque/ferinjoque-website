import { SUPABASE_URL } from './config.js';
const TRACK_URL = `${SUPABASE_URL}/functions/v1/track`;

let sessionId = sessionStorage.getItem('sessionId');
if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('sessionId', sessionId);
}

export async function trackEvent(type, data = {}) {
    try {
        await fetch(TRACK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({
                event_type: type,
                event_data: data
            }),
        });
    } catch (e) {
        console.error('Tracking error:', e);
    }
}