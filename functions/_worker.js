// functions/_worker.js
// This file is the main and sole entry point for Cloudflare Pages Functions.
// It consolidates all Hono application logic, including middleware and routes.

import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose'; // Import both for signing and verifying
import bcrypt from 'bcryptjs';

const app = new Hono();

// --- Global Middleware ---
// This middleware will run for all requests handled by this Hono app.
app.use('*', async (c, next) => {
    const env = c.env; // Cloudflare Pages automatically passes environment variables here
    const url = new URL(c.req.url);

    // Skip authentication for the login endpoint
    // The login endpoint needs to be accessible without a token to obtain one
    if (url.pathname === '/api/auth/login') {
        return next(); // Let the login request proceed without JWT check
    }

    // For all other routes, check for the Authorization header and JWT
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Authentication required. Please log in.' }, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const { payload } = await jwtVerify( // Use jwtVerify for verification
            token,
            new TextEncoder().encode(env.JWT_SECRET) // Use the JWT_SECRET from environment
        );

        c.set('user', payload); // Attach user payload to context
        await next(); // Proceed to the next handler/route

    } catch (error) {
        console.error('JWT verification failed:', error);
        return c.json({ error: 'Invalid or expired session. Please log in again.' }, 403);
    }
});

// --- Authentication Route ---
// Handles user login and JWT issuance
app.post('/api/auth/login', async (c) => {
    const { username, password } = await c.req.json();
    const env = c.env; // Access environment variables (DB, JWT_SECRET)

    // Basic input validation
    if (!username || !password) {
        return c.json({ error: 'Username and password are required.' }, 400);
    }

    try {
        // 1. Query D1 database to find the user by username
        const { results } = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
                                        .bind(username)
                                        .all();

        if (results.length === 0) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const user = results[0];

        // 2. Compare the provided plaintext password with the hashed password from D1
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        // 3. Generate a JSON Web Token (JWT) upon successful authentication
        const token = await new SignJWT( // Use SignJWT for signing
            { userId: user.id, username: user.username },
            new TextEncoder().encode(env.JWT_SECRET) // Use the JWT_SECRET from environment variables
        )
        .setProtectedHeader({ alg: 'HS256' }) // Algorithm used for signing
        .setExpirationTime('2h') // Token will expire in 2 hours
        .setIssuedAt() // Set the issued at time
        .sign(new TextEncoder().encode(env.JWT_SECRET)); // Sign the token with the secret key

        return c.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'An internal server error occurred during login.' }, 500);
    }
});

// --- Ads Data Retrieval Route ---
// Fetches ads data from the external DATA_URL
// This route is protected by the middleware defined above.
app.get('/api/ads', async (c) => {
    const env = c.env; // Access environment variables (like DATA_URL)
    // Access authenticated user data: const user = c.get('user');

    try {
        const response = await fetch(env.DATA_URL);

        if (!response.ok) {
            console.error('Failed to fetch data from external DATA_URL:', response.status, response.statusText);
            return c.json({ error: 'Failed to retrieve ads data from external source.' }, 500);
        }

        const data = await response.json();
        return c.json(data);

    } catch (error) {
        console.error('Error in ads data proxy:', error);
        return c.json({ error: 'An internal server error occurred while processing your request.' }, 500);
    }
});

// The onRequest handler is the standard entry point for Cloudflare Pages Functions.
// It receives the request context and delegates handling to the Hono application.
export async function onRequest(context) {
    // Cloudflare Pages automatically binds the 'request', 'env', and 'executionContext'
    // to the context object. These are passed directly to the Hono app's fetch method.
    return app.fetch(context.request, context.env, context.executionContext);
}
