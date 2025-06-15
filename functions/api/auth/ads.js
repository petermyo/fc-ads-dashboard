// functions/api/ads.js
// This file handles GET requests to /api/ads using file-based routing.
// It includes authentication middleware logic directly within this function.

import { jwtVerify } from 'jose';

export async function onRequest(context) {
    const { request, env } = context;
    console.log(`[API-ADS] Incoming Request - Path: ${request.url}, Method: ${request.method}`);

    // Ensure it's a GET request
    if (request.method !== 'GET') {
        console.log('[API-ADS] Method Not Allowed.');
        return new Response('Method Not Allowed', { status: 405 });
    }

    // --- Authentication Logic (Middleware for this route) ---
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[API-ADS] Authentication required. No Bearer token.');
        return new Response(JSON.stringify({ error: 'Authentication required. Please log in.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 401
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(env.JWT_SECRET)
        );
        console.log('[API-ADS] JWT verified successfully.', payload);
        // User payload is in 'payload' if needed for further logic
    } catch (error) {
        console.error('[API-ADS] JWT verification failed:', error);
        return new Response(JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 403
        });
    }
    // --- End Authentication Logic ---

    try {
        console.log('[API-ADS] Fetching data from DATA_URL...');
        const response = await fetch(env.DATA_URL);

        if (!response.ok) {
            console.error('Failed to fetch data from external DATA_URL:', response.status, response.statusText);
            return new Response(JSON.stringify({ error: 'Failed to retrieve ads data from external source.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500
            });
        }

        const data = await response.json();
        console.log('[API-ADS] Data fetched successfully.');
        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('[API-ADS] Error in data proxy:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred while processing your request.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
