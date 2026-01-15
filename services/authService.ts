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
        } catch (error) {
            // Fallback locale per sviluppo
            console.log('API non disponibile, usando autenticazione locale');

            const localUsers = this.getLocalUsers();
            const user = localUsers.find(
                u => u.username === username && u.password === password
            );

            if (!user) {
                throw new Error('Username o password non corretti');
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
        } catch (error) {
            // Fallback locale per sviluppo
            console.log('API non disponibile, usando registrazione locale');

            const localUsers = this.getLocalUsers();

            // Verifica se l'username esiste già
            if (localUsers.some(u => u.username === username)) {
                throw new Error('Username già esistente');
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
