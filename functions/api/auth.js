// functions/api/auth.js
import { Hono } from 'hono';
import { sign } from 'jose';
import bcrypt from 'bcryptjs';

const app = new Hono();

// POST endpoint for user login
app.post('/login', async (c) => {
    const { username, password } = await c.req.json();
    const env = c.env; // Access environment variables (DB, JWT_SECRET)

    if (!username || !password) {
        return c.json({ error: 'Username and password are required.' }, 400);
    }

    try {
        // Query D1 database to find the user by username
        const { results } = await env.DB.prepare('SELECT id, username, password FROM users WHERE username = ?')
                                        .bind(username)
                                        .all();

        // If no user found, return invalid credentials
        if (results.length === 0) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        const user = results[0];

        // Compare the provided password with the hashed password from D1
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        // If passwords don't match, return invalid credentials
        if (!isPasswordValid) {
            return c.json({ error: 'Invalid username or password.' }, 401);
        }

        // Generate a JSON Web Token (JWT)
        // The payload contains non-sensitive user information
        const token = await new sign(
            { userId: user.id, username: user.username },
            new TextEncoder().encode(env.JWT_SECRET) // Use the JWT_SECRET from environment
        )
        .setProtectedHeader({ alg: 'HS256' }) // Algorithm for signing
        .setExpirationTime('2h') // Token expires in 2 hours
        .setIssuedAt()
        .sign(); // Sign the token

        // Return successful login message and the JWT
        return c.json({ message: 'Login successful', token });

    } catch (error) {
        console.error('Login error:', error);
        return c.json({ error: 'An internal server error occurred during login.' }, 500);
    }
});

// Export the Hono app
export default app;
