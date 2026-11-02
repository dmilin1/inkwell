import { createContext, useEffect, useState } from 'react';
import { Ebook, Metadata, Stats } from '../models/Ebook';
import Library from '../models/Library';
import { Files } from '../utils/Files';


type LibraryContext = {
    libraryLoading: boolean,
    ebooksMetadata: Metadata[],
    loadEbooks: (loadOptions: LoadLibraryParams|undefined) => Promise<void>,
    promptToAddBook: () => Promise<void>,
    promptToDeleteBook: (filePath: string) => Promise<void>,
};

export type LoadLibraryParams = {
    reload?: boolean,
    reloadStatsOnly?: boolean,
}

export const LibraryContext = createContext<LibraryContext>({
    libraryLoading: true,
    ebooksMetadata: [],
    loadEbooks: async () => {},
    promptToAddBook: async () => {},
    promptToDeleteBook: async () => {},
});

export function LibraryProvider({ children }: React.PropsWithChildren) {
    const [ebooksMetadata, setEbooksMetadata] = useState<Metadata[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(true);

    const loadEbooks = async (loadOptions: LoadLibraryParams = {}) => {
        setLibraryLoading(true);
        try {
            const ebooks = Object.values(await Library.getBooks(loadOptions.reload));
            // One unreadable book must not take the whole library down with it.
            const results = await Promise.allSettled(
                ebooks.map(ebook => ebook.loadMetadata(loadOptions))
            );
            const metadata = await Promise.all(results.map((result, i) =>
                result.status === 'fulfilled'
                    ? result.value
                    : unreadableBookMetadata(ebooks[i], result.reason)
            ));
            setEbooksMetadata(metadata);
        } catch (e) {
            console.error(e);
            alert('Failed to load your library: ' + errorMessage(e));
        } finally {
            // Always finish loading: the splash screen stays up until this is false.
            setLibraryLoading(false);
        }
    }

    const promptToAddBook = async () => {
        const file = await Files.promptForFile();
        if (!file) {
            return;
        }
        try {
            await Library.addToLibrary(file);
        } catch (e) {
            alert(`Couldn't add the book: ${errorMessage(e)}`);
            return;
        }
        await loadEbooks({ reload: true });
        alert('Added book to library!')
    }

    const promptToDeleteBook = async (filePath: string) => {
        try {
            const didDelete = await Library.promptToDeleteBook(filePath)
            if (didDelete) {
                await loadEbooks({ reload: true });
            }
        } catch (e) {
            alert(`Couldn't delete the book: ${errorMessage(e)}`);
        }
    }

    useEffect(() => {
        loadEbooks();
    }, []);


    return (
        <LibraryContext.Provider value={{
            libraryLoading,
            ebooksMetadata,
            loadEbooks,
            promptToAddBook,
            promptToDeleteBook,
        }}>
            {children}
        </LibraryContext.Provider>
    );
}

export function errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/** Library entry for a book that couldn't be read, so it can still be seen and deleted. */
async function unreadableBookMetadata(ebook: Ebook, reason: unknown): Promise<Metadata> {
    console.error(`Couldn't read "${ebook.filePath}"`, reason);
    let stats: Stats = { addedAt: 0, lastOpenedAt: 0, deleted: false };
    try {
        stats = await ebook.getStats();
    } catch {
        // Keep the defaults.
    }
    const fileName = ebook.filePath.split('/').pop() ?? ebook.filePath;
    return {
        filePath: ebook.filePath,
        title: fileName,
        subjects: [],
        stats,
        progress: { chapterIndex: 0, scrollHeight: 0, percentComplete: 0 },
        error: errorMessage(reason),
    };
}