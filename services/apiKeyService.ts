// Service per gestire le API keys tramite database Vercel
export class ApiKeyService {
    private static readonly API_ENDPOINT = '/api/settings';
    private static readonly STORAGE_KEY = 'lettura_user_id';

    // Genera o recupera un user ID univoco
    static getUserId(): string {
        let userId = localStorage.getItem(this.STORAGE_KEY);
        if (!userId) {
            userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem(this.STORAGE_KEY, userId);
        }
        return userId;
    }

    // Recupera l'API key dal database
    static async getApiKey(): Promise<string | null> {
        try {
            const userId = this.getUserId();
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`);

            if (!response.ok) {
                console.error('Failed to fetch API key:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data.apiKey || null;
        } catch (error) {
            console.error('Error fetching API key:', error);
            return null;
        }
    }

    // Salva l'API key nel database
    static async saveApiKey(apiKey: string): Promise<boolean> {
        try {
            const userId = this.getUserId();
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey }),
            });

            if (!response.ok) {
                console.error('Failed to save API key:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error saving API key:', error);
            return false;
        }
    }

    // Elimina l'API key dal database
    static async deleteApiKey(): Promise<boolean> {
        try {
            const userId = this.getUserId();
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                console.error('Failed to delete API key:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error deleting API key:', error);
            return false;
        }
    }

    // Verifica se l'API key è valida (opzionale)
    static isValidApiKey(apiKey: string): boolean {
        // Gemini API keys iniziano con "AIza"
        return apiKey.trim().length > 0 && apiKey.startsWith('AIza');
    }
}
