export interface User {
    id: number;
    username: string;
    email: string;
    created_at?: string;
}

export class AuthService {
    private static readonly API_ENDPOINT = '/api/auth';
    private static readonly STORAGE_KEY = 'lettura_user';
    private static readonly TOKEN_KEY = 'lettura_token';

    // Ottiene l'utente corrente dalla sessione
    static getCurrentUser(): User | null {
        try {
            const userData = localStorage.getItem(this.STORAGE_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch {
            return null;
        }
    }

    // Salva l'utente nella sessione
    static setCurrentUser(user: User, token?: string): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        if (token) {
            localStorage.setItem(this.TOKEN_KEY, token);
        }
    }

    // Rimuove l'utente dalla sessione (logout)
    static clearCurrentUser(): void {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
    }

    // Verifica se l'utente è autenticato
    static isAuthenticated(): boolean {
        return this.getCurrentUser() !== null;
    }

    // Login
    static async login(username: string, password: string): Promise<User> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Credenziali non valide');
            }

            const data = await response.json();
            this.setCurrentUser(data.user, data.token);
            return data.user;
        } catch (error: any) {
            const errorMessage = error.message || '';

            // Se l'errore arriva dall'API (è un rifiuto esplicito), rilancialo.
            // Il fallback deve attivarsi SOLO se l'API non è raggiungibile (es. "Failed to fetch").
            const apiErrors = [
                'Credenziali non valide',
                'Username e password sono richiesti',
                'Username, password ed email sono richiesti',
                'Username già esistente',
                'Errore del server',
                'Method Not Allowed',
                'Errore durante la registrazione'
            ];

            if (apiErrors.some(msg => errorMessage.includes(msg))) {
                throw error;
            }

            // Fallback locale per sviluppo (solo se API non raggiungibile/offline)
            console.log('API offline o errore di rete, tentativo fallback locale:', error);

            const localUsers = this.getLocalUsers();
            const user = localUsers.find(
                u => u.username === username && u.password === password
            );

            if (!user) {
                // Se manca anche in locale, lancia un errore generico di connessione o credenziali
                // Ma se siamo qui, probabilmente è un problema di rete o l'utente non esiste in locale.
                // Per evitare confusione, diciamo "Impossibile accedere offline".
                throw new Error('Impossibile accedere. Verifica la connessione o le credenziali.');
            }

            const { password: _, ...userWithoutPassword } = user;
            this.setCurrentUser(userWithoutPassword as User);
            return userWithoutPassword as User;
        }
    }

    // Registrazione
    static async register(username: string, password: string, email: string): Promise<User> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, email }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Errore durante la registrazione');
            }

            const data = await response.json();
            this.setCurrentUser(data.user, data.token);
            return data.user;
        } catch (error: any) {
            const errorMessage = error.message || '';
            const apiErrors = [
                'Username già esistente',
                'Username, password ed email sono richiesti',
                'Errore durante la registrazione',
                'Errore del server'
            ];

            if (apiErrors.some(msg => errorMessage.includes(msg))) {
                throw error;
            }

            // Fallback locale per sviluppo
            console.log('API offline, usando registrazione locale:', error);

            const localUsers = this.getLocalUsers();

            // Verifica se l'username esiste già
            if (localUsers.some(u => u.username === username)) {
                throw new Error('Username già esistente (Locale)');
            }

            const newUser = {
                id: Date.now(),
                username,
                password,
                email,
                created_at: new Date().toISOString(),
            };

            localUsers.push(newUser);
            this.saveLocalUsers(localUsers);

            const { password: _, ...userWithoutPassword } = newUser;
            this.setCurrentUser(userWithoutPassword as User);
            return userWithoutPassword as User;
        }
    }

    // Logout
    static logout(): void {
        this.clearCurrentUser();
    }

    // Metodi helper per localStorage (fallback)
    private static getLocalUsers(): any[] {
        try {
            const data = localStorage.getItem('lettura_local_users');
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    private static saveLocalUsers(users: any[]): void {
        try {
            localStorage.setItem('lettura_local_users', JSON.stringify(users));
        } catch (error) {
            console.error('Error saving local users:', error);
        }
    }
}
