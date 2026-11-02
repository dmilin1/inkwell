import { Ebook } from './Ebook';
import { EbookLoader } from "./EbookLoader";
import includedBooks from '../resources/ebooks/ebooks';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

export type Ebooks = {
    [id: string]: Ebook;
}

export default class Library {

    private static readonly PATH = '/ebooks/';

    private static books: Ebooks = {};
    private static hasLoaded: Boolean = false;

    static async getBooks(reload: Boolean = false) {
        if (Library.hasLoaded && !reload) {
            return Library.books;
        }
        // Imported books are only read from disk when they're opened.
        const addedBooks = (await Library.getBookFileNames()).flatMap(fileName => {
            if (!EbookLoader.isSupported(fileName)) {
                console.warn(`Skipping unsupported file in the library: "${fileName}"`);
                return [];
            }
            return [EbookLoader.new(fileName, () => Library.readBookFile(fileName))];
        });
        let inclBooks = includedBooks
            .map(file => EbookLoader.new(file));
        const deleted = (await Promise.all(inclBooks.map(async (book) => book.getStats())))
            .map(stats => stats.deleted);
        inclBooks = inclBooks.filter((_, i) => !deleted[i]);
        const books = [...addedBooks, ...inclBooks];
        // Release any book that's no longer in the library.
        Object.values(Library.books)
            .filter(old => !books.some(book => book.filePath === old.filePath))
            .forEach(old => old.close());
        Library.books = books.reduce((obj, book) => ({
            ...obj,
            // Keep existing instances so an open book isn't replaced underneath the reader.
            [book.filePath]: Library.books[book.filePath] ?? book,
        }), {})
        Library.hasLoaded = true;
        return Library.books;
    }

    /** Throws an Error with a user-facing message if the file can't be added. */
    static async addToLibrary(file: File) {
        if (!EbookLoader.isSupported(file.name)) {
            throw new Error(`"${file.name}" isn't an EPUB file.`);
        }
        const path = `${Library.PATH}${file.name}`;
        if (await Library.fileExists(path)) {
            throw new Error(`"${file.name}" is already in your library.`);
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise((res, rej) => {
            reader.onload = res;
            reader.onerror = () => rej(reader.error ?? new Error("Couldn't read the file."));
        });
        const base64 = reader.result as string;
        await Filesystem.writeFile({
            path,
            data: base64,
            directory: Directory.Library,
            recursive: true,
        });
    }

    static async promptToDeleteBook(filePath: string): Promise<boolean> {
        const result = await ActionSheet.showActions({
            options: [{
                title: 'Delete From Library',
            }, {
                title: 'Cancel',
                style: ActionSheetButtonStyle.Cancel,
            }],
        });
        if (result.index === 0) {
            const book = Library.books[filePath];
            if (book.builtIn) {
                // Built-in books can't be removed from the app bundle; the
                // stats remember that they're hidden, so they must be kept.
                await book.setStats({ deleted: true });
            } else {
                await Filesystem.deleteFile({
                    path: `${Library.PATH}${filePath}`,
                    directory: Directory.Library,
                });
                await book.deleteStats();
            }
            await book.deleteSpot();
            await book.deleteCachedMetadata();
            book.close();
            return true;
        }
        return false;
    }

    private static async readBookFile(fileName: string): Promise<string | Blob> {
        return (await Filesystem.readFile({
            path: `${Library.PATH}${fileName}`,
            directory: Directory.Library,
        })).data;
    }

    private static async getBookFileNames(): Promise<string[]> {
        try {
            const dir = await Filesystem.readdir({
                path: Library.PATH,
                directory: Directory.Library,
            })
            return dir.files.filter(file => file.type !== 'directory').map(file => file.name);
        } catch (e) {
            // The folder is only created when the first book is added.
            if (isMissingFolderError(e)) {
                return [];
            }
            throw e;
        }
    }

    private static async fileExists(path: string): Promise<boolean> {
        try {
            await Filesystem.stat({ path, directory: Directory.Library });
            return true;
        } catch (e) {
            if (isMissingFolderError(e)) {
                return false;
            }
            throw e;
        }
    }
}

/**
 * Capacitor Filesystem reports a missing folder differently across versions
 * and platforms: v5 on iOS says "Folder does not exist.", v8 uses code
 * OS-PLUG-FILE-0008 ("'readdir' failed because file at '…' does not exist."),
 * and errors passed through from Apple say "… there is no such file."
 */
function isMissingFolderError(e: unknown): boolean {
    const { code, message } = (e ?? {}) as { code?: unknown, message?: unknown };
    return code === 'OS-PLUG-FILE-0008'
        || (typeof message === 'string' && /does not exist|no such file/i.test(message));
}
