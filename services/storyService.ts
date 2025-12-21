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

    // Recupera tutte le storie salvate
    static async getAllStories(userId: string): Promise<SavedStory[]> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}`);

            if (!response.ok) {
                console.error('Failed to fetch stories:', response.statusText);
                return [];
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching stories:', error);
            return [];
        }
    }

    // Recupera una storia specifica
    static async getStory(userId: string, storyId: number): Promise<SavedStory | null> {
        try {
            const response = await fetch(`${this.API_ENDPOINT}?userId=${userId}&id=${storyId}`);

            if (!response.ok) {
                console.error('Failed to fetch story:', response.statusText);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching story:', error);
            return null;
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
                console.error('Failed to save story:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data.story;
        } catch (error) {
            console.error('Error saving story:', error);
            return null;
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
                console.error('Failed to update story:', response.statusText);
                return null;
            }

            const data = await response.json();
            return data.story;
        } catch (error) {
            console.error('Error updating story:', error);
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
                console.error('Failed to delete story:', response.statusText);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error deleting story:', error);
            return false;
        }
    }

    // Incrementa il contatore di riproduzioni
    static async incrementPlayCount(userId: string, storyId: number): Promise<void> {
        try {
            await fetch(`${this.API_ENDPOINT}/play?userId=${userId}&id=${storyId}`, {
                method: 'POST',
            });
        } catch (error) {
            console.error('Error incrementing play count:', error);
        }
    }
}
