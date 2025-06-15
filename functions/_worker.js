// functions/_worker.js
// This is a minimal debugging version to isolate the 405 Method Not Allowed error.
// It will help confirm if POST requests are even reaching the Pages Function's Hono app.

import { Hono } from 'hono';

const app = new Hono();

// --- Universal Middleware for Logging ---
// This middleware will log every incoming request to help trace flow.
app.use('*', async (c, next) => {
    const url = new URL(c.req.url);
    console.log(`[Middleware] Path: ${url.pathname}, Method: ${c.req.method}, IP: ${c.request.headers.get('CF-Connecting-IP')}`);
    return next(); // Continue to the next Hono handler
});

// --- Debugging POST /api/auth/login Route ---
// This route is set up to return a simple JSON response for POST requests
// to confirm if the POST request is successfully routed by Hono.
app.post('/api/auth/login', async (c) => {
    console.log('[Auth Route] === HIT: POST /api/auth/login ===');
    try {
        const requestBody = await c.req.json();
        console.log('[Auth Route] Request body parsed:', requestBody);
        // Respond with a dummy successful JSON response
        return c.json({ message: 'Login successful (DEBUG MODE)', token: 'dummy.jwt.token' }, 200);
    } catch (e) {
        console.error('[Auth Route] Failed to parse JSON body or other error:', e);
        return c.json({ error: 'Failed to process request (DEBUG MODE)' }, 400);
    }
});

// --- Debugging GET /api/ads Route ---
// For verifying other API paths work with GET.
app.get('/api/ads', (c) => {
    console.log('[Ads Route] HIT: GET /api/ads (DEBUG)');
    return c.json({ message: "Ads data (DEBUG MODE)", data: [] }, 200);
});

// --- Debugging Root Path and Test Path ---
// To confirm the function responds to basic GET requests.
app.get('/', (c) => {
    console.log('[Root Route] HIT: GET / (DEBUG)');
    return c.text('Cloudflare Pages Function is active at root! (DEBUG MODE)');
});

app.get('/test', (c) => {
    console.log('[Test Route] HIT: GET /test (DEBUG)');
    return c.text('Test route is active! (DEBUG MODE)');
});

// The main entry point for Cloudflare Pages Functions.
// All incoming requests are passed to the Hono application's fetch method.
export async function onRequest(context) {
    const { request, env, executionContext } = context;
    console.log(`[onRequest] Handling request. URL: ${request.url}, Method: ${request.method}`);
    
    // Delegate the request handling to the Hono app.
    // Hono will then match the request against its defined routes (POST /api/auth/login, GET /api/ads, etc.).
    const response = await app.fetch(request, env, executionContext);
    console.log(`[onRequest] Hono responded with status: ${response.status}`);
    return response;
}
