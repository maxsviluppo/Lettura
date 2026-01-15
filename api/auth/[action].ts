import { sql } from '@vercel/postgres';

export const config = {
    runtime: 'edge',
};

interface LoginRequest {
    username: string;
    password: string;
}

interface RegisterRequest {
    username: string;
    password: string;
    email: string;
}

export default async function handler(request: Request) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        const url = new URL(request.url);
        const path = url.pathname;

        // LOGIN
        if (path.endsWith('/login') && request.method === 'POST') {
            const body: LoginRequest = await request.json();
            const { username, password } = body;

            if (!username || !password) {
                return new Response(
                    JSON.stringify({ error: 'Username e password sono richiesti' }),
                    { status: 400, headers }
                );
            }

            // Cerca l'utente nel database
            const { rows } = await sql`
                SELECT id, username, email, password_hash, created_at 
                FROM users 
                WHERE username = ${username}
            `;

            if (rows.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'Credenziali non valide' }),
                    { status: 401, headers }
                );
            }

            const user = rows[0];

            // Verifica password (in produzione usa bcrypt!)
            // Per semplicità ora confronto diretto, ma DEVI usare hash in produzione
            if (user.password_hash !== password) {
                return new Response(
                    JSON.stringify({ error: 'Credenziali non valide' }),
                    { status: 401, headers }
                );
            }

            // Genera token semplice (in produzione usa JWT!)
            const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

            return new Response(
                JSON.stringify({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        created_at: user.created_at,
                    },
                    token,
                }),
                { status: 200, headers }
            );
        }

        // REGISTER
        if (path.endsWith('/register') && request.method === 'POST') {
            const body: RegisterRequest = await request.json();
            const { username, password, email } = body;

            if (!username || !password || !email) {
                return new Response(
                    JSON.stringify({ error: 'Username, password ed email sono richiesti' }),
                    { status: 400, headers }
                );
            }

            // Verifica se l'username esiste già
            const { rows: existingUsers } = await sql`
                SELECT id FROM users WHERE username = ${username}
            `;

            if (existingUsers.length > 0) {
                return new Response(
                    JSON.stringify({ error: 'Username già esistente' }),
                    { status: 409, headers }
                );
            }

            // Crea nuovo utente (in produzione usa bcrypt per l'hash!)
            const { rows } = await sql`
                INSERT INTO users (username, email, password_hash)
                VALUES (${username}, ${email}, ${password})
                RETURNING id, username, email, created_at
            `;

            const newUser = rows[0];
            const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');

            return new Response(
                JSON.stringify({
                    success: true,
                    user: newUser,
                    token,
                }),
                { status: 201, headers }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Endpoint non trovato' }),
            { status: 404, headers }
        );

    } catch (error: unknown) {
        console.error('Auth API Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: 'Errore del server', details: errorMessage }),
            { status: 500, headers }
        );
    }
}
