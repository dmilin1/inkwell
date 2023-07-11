import { createContext, useEffect, useState } from 'react';
import { Metadata } from '../models/Ebook';
import Library from '../models/Library';
import { Files } from '../utils/Files';


type LibraryContext = {
    libraryLoading: boolean,
    ebooksMetadata: Metadata[],
    loadEbooks: (reload?: boolean) => Promise<void>,
    promptToAddBook: () => Promise<void>,
    promptToDeleteBook: (filePath: string) => Promise<void>,
};

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

    const loadEbooks = async (reload = false) => {
        setLibraryLoading(true);
        const ebooks = await Library.getBooks(reload);
        const metadata = await Promise.all(
            Object.values(ebooks).map(ebook => ebook.loadMetadata())
        );
        setEbooksMetadata(metadata);
        setLibraryLoading(false);
    }

    const promptToAddBook = async () => {
        let file = await Files.promptForFile();
        await Library.addToLibrary(file);
        await loadEbooks(true);
    }
    
    const promptToDeleteBook = async (filePath: string) => {
        const didDelete = await Library.promptToDeleteBook(filePath)
        if (didDelete) {
            await loadEbooks(true);
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