// functions/index.js
// This file handles GET requests to the root path (/) using file-based routing.

export async function onRequest(context) {
    const { request } = context;
    console.log(`[ROOT-ROUTE] Incoming Request - Path: ${request.url}, Method: ${request.method}`);

    if (request.method === 'GET') {
        console.log('[ROOT-ROUTE] HIT: GET /');
        return new Response('Cloudflare Pages Function is active at root! (File-based routing)', {
            headers: { 'Content-Type': 'text/plain' },
            status: 200
        });
    }

    console.log(`[ROOT-ROUTE] Not handled: Method ${request.method}.`);
    return new Response('Method Not Allowed for root path.', { status: 405 });
}
