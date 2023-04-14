import { Preferences } from '@capacitor/preferences';

export interface Ebook {
    filePath: string;
    base64?: string;

    loadMetadata(): Promise<Metadata>;
    loadChapters(): Promise<Chapters>;
    saveSpot(data: SaveSpot): Promise<void>;
    loadSpot(): Promise<SaveSpot|null>;
}

export type Stats = {
    addedAt: number;
    lastOpenedAt: number;
    percentComplete: number;
}

export type Metadata = {
    filePath: string;
    title?: string;
    author?: string;
    language?: string;
    date?: string;
    description?: string;
    subjects: string[];
    coverImgPath?: string;
    stats: Stats;
    progress: SaveSpot;
}

export interface HTMLOptions {
    changeChapter: (newChapter: Chapter) => void;
}

export interface Chapter {
    title: string,
    fileName: string,
    size: number,
    index: number,

    loadHTML(options: HTMLOptions): Promise<HTMLElement[]>;
}

export interface Chapters {
    path(filepath: string): Chapter;
    index(i: number): Chapter;
    ordered(): Chapter[];
}

export interface SaveSpot {
    chapterIndex: number,
    scrollHeight: number,
    percentComplete: number,
}

export class Ebook implements Ebook {
    filePath: string;
    base64?: string;

    constructor(filePath: string, blob?: string) {
        this.filePath = filePath;
        this.base64 = blob;
    }

    async getStats(): Promise<Stats> {
        const key = `${this.filePath}-stats`;
        const statsStr = (await Preferences.get({ key })).value;
        const savedStats: Partial<Stats> = statsStr ? JSON.parse(statsStr) : {};
        const defaultStats: Stats = {
            addedAt: Date.now(),
            lastOpenedAt: 0,
            percentComplete: 0
        };
        return {
            ...defaultStats,
            ...savedStats,
        };
    }

    async setStats(changes: Partial<Stats>) {
        const key = `${this.filePath}-stats`;
        const oldStats = await this.getStats();
        const newStats = {
            ...oldStats,
            ...changes,
        };
        await Preferences.set({ key, value: JSON.stringify(newStats) });
    }

    async saveSpot(data: SaveSpot) {
        const key = `${this.filePath}-saveSpot`;
        await Preferences.set({ key, value: JSON.stringify(data) });
    }

    async loadSpot() {
        const key = `${this.filePath}-saveSpot`;
        const str = (await Preferences.get({ key })).value;
        if (str) {
            return JSON.parse(str);
        }
        return null;
    }
}