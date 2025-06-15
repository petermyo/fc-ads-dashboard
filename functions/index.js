// functions/index.js
// This file defines the Hono application with its middleware and routes.
// It is now imported by functions/_worker.js, which acts as the Pages Function entry point.

import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const app = new Hono();

// --- Global Middleware ---
// This middleware will run for all requests handled by this Hono app.
app.use('*', async (c, next) => {
    const env = c.env; // Cloudflare Pages automatically passes environment variables here
    const url = new URL(c.req.url);

    // Skip authentication for the login endpoint
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
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(env.JWT_SECRET) // Use the JWT_SECRET from environment
        );

        c.set('user', payload);
        await next();

    } catch (error) {
        console.error('JWT verification failed:', error);
        return c.json({ error: 'Invalid or expired session. Please log in again.' }, 403);
    }
});

// --- Authentication Route ---
// Handles user login and JWT issuance
app.post('/api/auth/login', async (c) => {
    const { username, password } = await c.req.json();
    const env = c.env;

    if (!username || !password) {
        return c.json({ error: 'Username and password are required.' }, 400);
    }

    try {
        const { results } = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
                                        .bind(username)
                                        .all();

        if (results.length === 0) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const user = results[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        if (!isPasswordValid) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const token = await new SignJWT(
            { userId: user.id, username: user.username },
            new TextEncoder().encode(env.JWT_SECRET)
        )
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .setIssuedAt()
        .sign(new TextEncoder().encode(env.JWT_SECRET));

        return c.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'An internal server error occurred during login.' }, 500);
    }
});

// --- Ads Data Retrieval Route ---
// Fetches ads data from the external DATA_URL
app.get('/api/ads', async (c) => {
    const env = c.env;

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

// Export the Hono app instance itself, which will be imported by _worker.js
export const honoApp = app;
