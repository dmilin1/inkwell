import { Preferences } from '@capacitor/preferences';
import { LoadLibraryParams } from '../contexts/LibraryContext';

export interface Ebook {
    filePath: string;
    builtIn: boolean;
    base64?: string;

    loadMetadata(loadOptions?: LoadLibraryParams): Promise<Metadata>;
    loadChapters(): Promise<Chapters>;
    saveSpot(data: SaveSpot): Promise<void>;
    loadSpot(): Promise<SaveSpot|null>;
}

export type Stats = {
    addedAt: number;
    lastOpenedAt: number;
    deleted: boolean; // only used by built-in books
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
    builtIn: boolean;
    base64?: string;

    constructor(filePath: string, blob?: string) {
        this.filePath = filePath;
        this.builtIn = !blob;
        this.base64 = blob;
    }

    async getCachedMetadata(): Promise<Metadata|null> {
        const key = `${this.filePath}-cachedMetadata`;
        const metadataStr = (await Preferences.get({ key })).value;
        const metadata = metadataStr ? JSON.parse(metadataStr) : null;
        return metadata;
    }

    async setCachedMetadata(metadata: Metadata) {
        const key = `${this.filePath}-cachedMetadata`;
        await Preferences.set({ key, value: JSON.stringify(metadata) });
    }

    async deleteCachedMetadata() {
        const key = `${this.filePath}-cachedMetadata`;
        await Preferences.remove({ key });
    }

    async getStats(): Promise<Stats> {
        const key = `${this.filePath}-stats`;
        const statsStr = (await Preferences.get({ key })).value;
        const savedStats: Partial<Stats> = statsStr ? JSON.parse(statsStr) : {};
        const defaultStats: Stats = {
            addedAt: Date.now(),
            lastOpenedAt: 0,
            deleted: false,
        };
        if (savedStats.addedAt === undefined) {
            await Preferences.set({ key, value: JSON.stringify(defaultStats) });
        }
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

    async deleteStats() {
        const key = `${this.filePath}-stats`;
        await Preferences.remove({ key });
    }

    async saveSpot(data: SaveSpot) {
        const key = `${this.filePath}-saveSpot`;
        await Preferences.set({ key, value: JSON.stringify(data) });
    }

    async loadSpot(): Promise<SaveSpot> {
        const key = `${this.filePath}-saveSpot`;
        const str = (await Preferences.get({ key })).value;
        const defaultSpot: SaveSpot = {
            chapterIndex: 0,
            scrollHeight: 0,
            percentComplete: 0,
        };
        if (str) {
            return JSON.parse(str);
        } else {
            await Preferences.set({ key, value: JSON.stringify(defaultSpot) });
        }
        return defaultSpot;
    }
}