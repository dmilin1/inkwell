import { Preferences } from '@capacitor/preferences';
import { LoadLibraryParams } from '../contexts/LibraryContext';
import { ReadingPosition } from '../utils/ReadingPosition';

export interface Ebook {
    filePath: string;
    builtIn: boolean;

    loadMetadata(loadOptions?: LoadLibraryParams): Promise<Metadata>;
    loadChapters(): Promise<Chapters>;
    /** Frees the memory used while the book was open for reading. */
    close(): void;
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
    /** Set when the book couldn't be read; it's still listed so it can be deleted. */
    error?: string;
}

export interface HTMLOptions {
    /** Go to another chapter, optionally to an element id within it. */
    changeChapter: (newChapter: Chapter, anchor?: string) => void;
    /** Scroll to an element id within the current chapter. */
    scrollToAnchor: (anchor: string) => void;
}

export interface Chapter {
    /** From the table of contents; undefined for untitled sections. */
    title?: string,
    /** Full path of the chapter file inside the book. */
    path: string,
    size: number,
    index: number,

    loadHTML(options: HTMLOptions): Promise<HTMLElement[]>;
}

export interface Chapters {
    path(path: string): Chapter | undefined;
    index(i: number): Chapter | undefined;
    ordered(): Chapter[];
}

export interface SaveSpot {
    chapterIndex: number,
    /** Pixel scroll offset. Kept for spots saved by older versions; prefer `position`. */
    scrollHeight: number,
    percentComplete: number,
    /** Layout-independent position within the chapter (survives reflows). */
    position?: ReadingPosition,
}

export class Ebook implements Ebook {
    filePath: string;
    builtIn: boolean;
    /** Reads an imported book's file. Built-in books are fetched from `filePath` instead. */
    protected readFileData?: () => Promise<string | Blob>;

    constructor(filePath: string, readFileData?: () => Promise<string | Blob>) {
        this.filePath = filePath;
        this.builtIn = !readFileData;
        this.readFileData = readFileData;
    }

    close() {}

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

    async deleteSpot() {
        const key = `${this.filePath}-saveSpot`;
        await Preferences.remove({ key });
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