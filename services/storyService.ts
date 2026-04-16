// Service per gestire le storie salvate
export interface SavedStory {
    id?: number;
    title: string;
    content: string;
    category?: string;
    created_at?: string;
    updated_at?: string;
    last_played_at?: string;
    play_count?: number;
}

export class StoryService {
    private static readonly API_ENDPOINT = '/api/stories';
    private static readonly STORAGE_KEY = 'lettura_stories';

    // Verifica se l'API è disponibile (produzione) o usa localStorage (locale)
    private static async isApiAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=test`, { method: 'HEAD' });
            return response.ok || response.status === 400; // 400 è ok, significa che l'API esiste
        } catch {
            return false;
        }
    }

    // LocalStorage fallback methods
    private static getLocalStories(userId: string): SavedStory[] {
        try {
            const data = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return [];
        }
    }

    private static saveLocalStories(userId: string, stories: SavedStory[]): void {
        try {
            localStorage.setItem(`${this.STORAGE_KEY}_${userId}`, JSON.stringify(stories));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Recupera tutte le storie salvate
    static async getAllStories(userId: string): Promise<SavedStory[]> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`);

            if (!response.ok) {
                console.log('API not available, using localStorage');
                return this.getLocalStories(userId);
            }

            return await response.json();
        } catch (error) {
            console.log('API error, falling back to localStorage:', error);
            return this.getLocalStories(userId);
        }
    }

    // Recupera una storia specifica
    static async getStory(userId: string, storyId: number): Promise<SavedStory | null> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}&id=${storyId}`);

            if (!response.ok) {
                const stories = this.getLocalStories(userId);
                return stories.find(s => s.id === storyId) || null;
            }

            return await response.json();
        } catch (error) {
            console.log('API error, falling back to localStorage:', error);
            const stories = this.getLocalStories(userId);
            return stories.find(s => s.id === storyId) || null;
        }
    }

    // Salva una nuova storia
    static async saveStory(userId: string, story: SavedStory): Promise<SavedStory | null> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(story),
            });

            if (!response.ok) {
                // Fallback a localStorage
                const stories = this.getLocalStories(userId);
                const newStory: SavedStory = {
                    ...story,
                    id: Date.now(), // Usa timestamp come ID
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    play_count: 0,
                };
                stories.unshift(newStory);
                this.saveLocalStories(userId, stories);
                return newStory;
            }

            const data = await response.json();
            return data.story;
        } catch (error) {
            console.log('API error, falling back to localStorage:', error);
            // Fallback a localStorage
            const stories = this.getLocalStories(userId);
            const newStory: SavedStory = {
                ...story,
                id: Date.now(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                play_count: 0,
            };
            stories.unshift(newStory);
            this.saveLocalStories(userId, stories);
            return newStory;
        }
    }

    // Aggiorna una storia esistente
    static async updateStory(userId: string, storyId: number, story: Partial<SavedStory>): Promise<SavedStory | null> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}&id=${storyId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(story),
            });

            if (!response.ok) {
                // Fallback a localStorage
                const stories = this.getLocalStories(userId);
                const index = stories.findIndex(s => s.id === storyId);
                if (index !== -1) {
                    stories[index] = {
                        ...stories[index],
                        ...story,
                        updated_at: new Date().toISOString(),
                    };
                    this.saveLocalStories(userId, stories);
                    return stories[index];
                }
                return null;
            }

            const data = await response.json();
            return data.story;
        } catch (error) {
            console.log('API error, falling back to localStorage:', error);
            const stories = this.getLocalStories(userId);
            const index = stories.findIndex(s => s.id === storyId);
            if (index !== -1) {
                stories[index] = {
                    ...stories[index],
                    ...story,
                    updated_at: new Date().toISOString(),
                };
                this.saveLocalStories(userId, stories);
                return stories[index];
            }
            return null;
        }
    }

    // Elimina una storia
    static async deleteStory(userId: string, storyId: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}&id=${storyId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                // Fallback a localStorage
                const stories = this.getLocalStories(userId);
                const filtered = stories.filter(s => s.id !== storyId);
                this.saveLocalStories(userId, filtered);
                return true;
            }

            return true;
        } catch (error) {
            console.log('API error, falling back to localStorage:', error);
            const stories = this.getLocalStories(userId);
            const filtered = stories.filter(s => s.id !== storyId);
            this.saveLocalStories(userId, filtered);
            return true;
        }
    }

    // Incrementa il contatore di riproduzioni
    static async incrementPlayCount(userId: string, storyId: number): Promise<void> {
        try {
            await fetch(`${this.API_ENDPOINT}/play?userId=${userId}&id=${storyId}`, {
                method: 'POST',
            });
        } catch (error) {
            // Fallback a localStorage
            const stories = this.getLocalStories(userId);
            const story = stories.find(s => s.id === storyId);
            if (story) {
                story.play_count = (story.play_count || 0) + 1;
                story.last_played_at = new Date().toISOString();
                this.saveLocalStories(userId, stories);
            }
        }
    }
}
