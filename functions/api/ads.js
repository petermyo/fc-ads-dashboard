// functions/api/ads.js
import { Hono } from 'hono';

const app = new Hono();

// GET endpoint to fetch ads data
app.get('/', async (c) => {
    const env = c.env; // Access environment variables (DATA_URL)
    // You can access the user data from the JWT if needed, e.g., const user = c.get('user');

    try {
        // Make an internal fetch request to the DATA_URL.
        // This request happens from the Cloudflare Worker, keeping the DATA_URL secret from the client.
        const response = await fetch(env.DATA_URL);

        if (!response.ok) {
            console.error('Failed to fetch data from external DATA_URL:', response.status, response.statusText);
            return c.json({ error: 'Failed to retrieve ads data from external source.' }, 500);
        }

        const data = await response.json();
        // Return the fetched data to the client
        return c.json(data);

    } catch (error) {
        console.error('Error in ads data proxy:', error);
        return c.json({ error: 'An internal server error occurred while processing your request.' }, 500);
    }
});

// Export the Hono app
export default app;
