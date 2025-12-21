import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
};

interface SavedStory {
    id?: number;
    title: string;
    content: string;
    category?: string;
}

export default async function handler(request: Request) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        const url = new URL(request.url);
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId is required' }),
                { status: 400, headers }
            );
        }

        // GET: Recupera tutte le storie salvate
        if (request.method === 'GET') {
            const storyId = url.searchParams.get('id');

            if (storyId) {
                // Recupera una storia specifica
                const { rows } = await sql`
          SELECT * FROM saved_stories 
          WHERE id = ${storyId} AND user_id = ${userId}
        `;

                if (rows.length === 0) {
                    return new Response(
                        JSON.stringify({ error: 'Story not found' }),
                        { status: 404, headers }
                    );
                }

                return new Response(
                    JSON.stringify(rows[0]),
                    { status: 200, headers }
                );
            } else {
                // Recupera tutte le storie dell'utente
                const { rows } = await sql`
          SELECT * FROM saved_stories 
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
        `;

                return new Response(
                    JSON.stringify(rows),
                    { status: 200, headers }
                );
            }
        }

        // POST: Salva una nuova storia
        if (request.method === 'POST') {
            const body: SavedStory = await request.json();
            const { title, content, category } = body;

            if (!title || !content) {
                return new Response(
                    JSON.stringify({ error: 'title and content are required' }),
                    { status: 400, headers }
                );
            }

            const { rows } = await sql`
        INSERT INTO saved_stories (user_id, title, content, category)
        VALUES (${userId}, ${title}, ${content}, ${category || null})
        RETURNING *
      `;

            return new Response(
                JSON.stringify({ success: true, story: rows[0] }),
                { status: 201, headers }
            );
        }

        // PUT: Aggiorna una storia esistente
        if (request.method === 'PUT') {
            const storyId = url.searchParams.get('id');

            if (!storyId) {
                return new Response(
                    JSON.stringify({ error: 'Story id is required' }),
                    { status: 400, headers }
                );
            }

            const body: SavedStory = await request.json();
            const { title, content, category } = body;

            const { rows } = await sql`
        UPDATE saved_stories 
        SET 
          title = COALESCE(${title}, title),
          content = COALESCE(${content}, content),
          category = COALESCE(${category}, category),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${storyId} AND user_id = ${userId}
        RETURNING *
      `;

            if (rows.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'Story not found or unauthorized' }),
                    { status: 404, headers }
                );
            }

            return new Response(
                JSON.stringify({ success: true, story: rows[0] }),
                { status: 200, headers }
            );
        }

        // DELETE: Elimina una storia
        if (request.method === 'DELETE') {
            const storyId = url.searchParams.get('id');

            if (!storyId) {
                return new Response(
                    JSON.stringify({ error: 'Story id is required' }),
                    { status: 400, headers }
                );
            }

            const { rows } = await sql`
        DELETE FROM saved_stories 
        WHERE id = ${storyId} AND user_id = ${userId}
        RETURNING id
      `;

            if (rows.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'Story not found or unauthorized' }),
                    { status: 404, headers }
                );
            }

            return new Response(
                JSON.stringify({ success: true, message: 'Story deleted successfully' }),
                { status: 200, headers }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers }
        );

    } catch (error: unknown) {
        console.error('API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: 'Internal server error', details: errorMessage }),
            { status: 500, headers }
        );
    }
}
