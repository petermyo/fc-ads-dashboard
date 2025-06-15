// functions/_middleware.js
import { verify } from 'jose';
import { Hono } from 'hono';

// Create a Hono app instance for middleware
const app = new Hono();

// This middleware will run for all requests to pages functions in this directory tree.
app.use('*', async (c, next) => {
    const env = c.env; // Cloudflare Pages automatically passes environment variables here
    const url = new URL(c.req.url);

    // Skip authentication for the login endpoint
    if (url.pathname === '/api/auth/login') {
        return next();
    }

    const authHeader = c.req.header('Authorization');

    // If no Authorization header or not a Bearer token, return unauthorized
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Authentication required. Please log in.' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the JWT using the secret key from environment variables
        const { payload } = await verify(
            token,
            new TextEncoder().encode(env.JWT_SECRET)
        );

        // Attach the decoded user payload to the context for downstream handlers
        c.set('user', payload); // 'user' can now be accessed in `c.get('user')` in other functions
        
        // Proceed to the next handler (e.g., /api/ads.js)
        await next();

    } catch (error) {
        console.error('JWT verification failed:', error);
        // Return 403 Forbidden for invalid or expired tokens
        return c.json({ error: 'Invalid or expired session. Please log in again.' }, 403);
    }
});

// Export the Hono app as the default handler for the middleware
export default app;
