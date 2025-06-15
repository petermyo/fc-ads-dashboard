// functions/_worker.js
// This file is the main entry point for Cloudflare Pages Functions.
// It imports the Hono application and exposes its fetch handler.

import { honoApp } from './index.js'; // Import the Hono app from index.js

// The onRequest handler is the standard entry point for Pages Functions.
// It receives the request context and passes it to the Hono app's fetch method.
export async function onRequest(context) {
    // Cloudflare Pages automatically binds the 'request', 'env', and 'executionContext'
    // to the context object. These are passed to the Hono app's fetch method.
    return honoApp.fetch(context.request, context.env, context.executionContext);
}
