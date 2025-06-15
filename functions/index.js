// functions/index.js
// This file serves as the main entry point for your Cloudflare Pages Functions.
// It handles routing for both authentication and ads data retrieval.

import { Hono } from 'hono';
import { sign } from 'jose';
import bcrypt from 'bcryptjs';

const app = new Hono();

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
        // Ensure you select the password_hash column for comparison
        const { results } = await env.DB.prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
                                        .bind(username)
                                        .all();

        // If no user found with the given username
        if (results.length === 0) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const user = results[0];

        // 2. Compare the provided plaintext password with the hashed password from D1
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        
        // If passwords do not match
        if (!isPasswordValid) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        // 3. Generate a JSON Web Token (JWT) upon successful authentication
        // The payload typically includes non-sensitive user identifiers
        const token = await new sign(
            { userId: user.id, username: user.username },
            new TextEncoder().encode(env.JWT_SECRET) // Use the JWT_SECRET from environment variables
        )
        .setProtectedHeader({ alg: 'HS256' }) // Algorithm used for signing
        .setExpirationTime('2h') // Token will expire in 2 hours
        .setIssuedAt() // Set the issued at time
        .sign(); // Sign the token with the secret key

        // Return a successful login message and the generated JWT
        return c.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error);
        // Return a generic internal server error for unexpected issues
        return c.json({ error: 'An internal server error occurred during login.' }, 500);
    }
});

// --- Ads Data Retrieval Route ---
// Fetches ads data from the external DATA_URL
// This route is protected by _middleware.js, so only authenticated requests reach here
app.get('/api/ads', async (c) => {
    const env = c.env; // Access environment variables (like DATA_URL)
    // You can access user data passed from the middleware, e.g., const user = c.get('user');

    try {
        // Make an internal fetch request to the external DATA_URL.
        // This request is performed by the Cloudflare Worker, keeping the DATA_URL secret from the client.
        const response = await fetch(env.DATA_URL);

        // Check if the external data fetch was successful
        if (!response.ok) {
            console.error('Failed to fetch data from external DATA_URL:', response.status, response.statusText);
            return c.json({ error: 'Failed to retrieve ads data from external source.' }, 500);
        }

        const data = await response.json();
        // Return the fetched data to the client
        return c.json(data);

    } catch (error) {
        console.error('Error in ads data proxy:', error);
        // Return a generic internal server error for unexpected issues
        return c.json({ error: 'An internal server error occurred while processing your request.' }, 500);
    }
});

// Export the Hono app's fetch method directly.
// Cloudflare Pages will use this `fetch` handler as the main entry point
// for API routes defined within this `functions` directory.
export default app.fetch;
