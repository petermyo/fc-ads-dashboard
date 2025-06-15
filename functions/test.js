// functions/test.js
// This file handles GET requests to /test using file-based routing.

export async function onRequest(context) {
    const { request } = context;
    console.log(`[TEST-ROUTE] Incoming Request - Path: ${request.url}, Method: ${request.method}`);

    if (request.method === 'GET') {
        console.log('[TEST-ROUTE] HIT: GET /test');
        return new Response('Test route is active! (File-based routing)', {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
        });
    }

    console.log(`[TEST-ROUTE] Not handled: Method ${request.method}.`);
    return new Response('Method Not Allowed for test path.', { status: 405 });
}
