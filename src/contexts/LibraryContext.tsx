import { createContext, useEffect, useState } from 'react';
import { Metadata } from '../models/Ebook';
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
        const ebooks = await Library.getBooks(loadOptions.reload);
        const metadata = await Promise.all(
            Object.values(ebooks).map(ebook => ebook.loadMetadata(loadOptions))
        );
        setEbooksMetadata(metadata);
        setLibraryLoading(false);
    }

    const promptToAddBook = async () => {
        let file = await Files.promptForFile();
        await Library.addToLibrary(file);
        await loadEbooks({ reload: true });
        alert('Added book to library!')
    }
    
    const promptToDeleteBook = async (filePath: string) => {
        const didDelete = await Library.promptToDeleteBook(filePath)
        if (didDelete) {
            await loadEbooks({ reload: true });
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