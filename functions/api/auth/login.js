    // functions/api/auth/login.js
// This file handles POST requests to /api/auth/login using file-based routing.

import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

export async function onRequest(context) {
    const { request, env } = context;
    console.log(`[AUTH-LOGIN] Incoming Request - Path: ${request.url}, Method: ${request.method}`);

    // Ensure it's a POST request
    if (request.method !== 'POST') {
        console.log('[AUTH-LOGIN] Method Not Allowed.');
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const { username, password } = await request.json();
        console.log(`[AUTH-LOGIN] Parsed credentials: Username=${username}`);

        // 1. Query D1 database to find the user by username
        console.log(`[AUTH-LOGIN] Querying DB for user: ${username}`);
        const { results } = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
                                        .bind(username)
                                        .all();

        if (results.length === 0) {
            console.log('[AUTH-LOGIN] User not found in DB.');
            return new Response(JSON.stringify({ error: 'Invalid username or password.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401
            });
        }

        const user = results[0];
        console.log('[AUTH-LOGIN] User found in DB.');

        // 2. Compare the provided plaintext password with the hashed password from D1
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log(`[AUTH-LOGIN] Password valid: ${isPasswordValid}`);
        
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: 'Invalid username or password.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401
            });
        }

        // 3. Generate a JSON Web Token (JWT) upon successful authentication
        console.log('[AUTH-LOGIN] Generating JWT...');
        const token = await new SignJWT(
            { userId: user.id, username: user.username },
            new TextEncoder().encode(env.JWT_SECRET)
        )
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('2h')
        .setIssuedAt()
        .sign(new TextEncoder().encode(env.JWT_SECRET));
        console.log('[AUTH-LOGIN] JWT generated.');

        return new Response(JSON.stringify({ message: 'Login successful', token }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error) {
        console.error('[AUTH-LOGIN] Login error:', error);
        return new Response(JSON.stringify({ error: 'An internal server error occurred during login.' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
