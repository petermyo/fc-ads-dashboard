// functions/_worker.js
// This is an ultra-minimal version to diagnose 405 Method Not Allowed.
// It bypasses Hono and all other logic to test fundamental Pages Function behavior.

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);

    console.log(`[ULTRA-MINIMAL] Incoming Request - Path: ${url.pathname}, Method: ${request.method}`);

    // If it's a POST request to /api/auth/login, respond directly.
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
        console.log('[ULTRA-MINIMAL] HIT: POST /api/auth/login. Sending dummy success.');
        return new Response(JSON.stringify({ message: 'Login endpoint HIT (ULTRA-MINIMAL DEBUG)', token: 'dummy.token' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
    }

    // For any other GET request (like / or /test)
    if (request.method === 'GET') {
        console.log(`[ULTRA-MINIMAL] HIT: GET ${url.pathname}`);
        return new Response(`Hello from Pages Function at ${url.pathname}! (ULTRA-MINIMAL DEBUG)`, {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
        });
    }

    // For any other request method or path not explicitly handled
    console.log(`[ULTRA-MINIMAL] Not handled: Method ${request.method}, Path ${url.pathname}.`);
    return new Response('Not Found or Method Not Allowed (ULTRA-MINIMAL DEBUG fallback)', { status: 404 });
}
