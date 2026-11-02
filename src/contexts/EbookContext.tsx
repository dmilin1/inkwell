import { createContext, useContext, useState } from 'react';
import { Ebook, Metadata } from '../models/Ebook';
import { LibraryContext, LoadLibraryParams, errorMessage } from './LibraryContext';


type EbookContext = {
    ebook?: Ebook,
    metadata?: Metadata,
    changeEbook: (newEbook?: Ebook, loadOptions?: LoadLibraryParams) => void,
    /** Closes the open book and returns to the library. */
    closeEbook: () => void,
    refreshProgress: () => void,
};

export const EbookContext = createContext<EbookContext>({
    changeEbook: () => {},
    closeEbook: () => {},
    refreshProgress: () => {},
});

export function EbookProvider({ children }: React.PropsWithChildren) {
    const { loadEbooks } = useContext(LibraryContext);
    const [ebook, setEbook] = useState<Ebook | undefined>();
    const [metadata, setMetadata] = useState<Metadata | undefined>();

    const changeEbook = async (newEbook?: Ebook, loadOptions: LoadLibraryParams = {}) => {
        let newMetadata: Metadata | undefined;
        if (newEbook) {
            try {
                newMetadata = await newEbook.loadMetadata(loadOptions);
            } catch (e) {
                console.error(e);
                alert(`Couldn't open this book: ${errorMessage(e)}`);
                return;
            }
        }
        if (ebook && ebook !== newEbook) {
            ebook.close();
        }
        setMetadata(newMetadata);
        setEbook(newEbook);
        newEbook?.setStats({ lastOpenedAt: Date.now() });
    }

    const closeEbook = () => {
        changeEbook(undefined);
        // Refresh progress and "recently opened" in the library.
        setTimeout(() => loadEbooks({ reloadStatsOnly: true }), 100);
    }

    const refreshProgress = async () => {
        if (ebook && metadata) {
            let spot = await ebook.loadSpot();
            setMetadata({
                ...metadata,
                progress: spot,
            });
        }
    }

    return (
        <EbookContext.Provider value={{
            ebook,
            metadata,
            changeEbook,
            closeEbook,
            refreshProgress,
        }}>
            {children}
        </EbookContext.Provider>
    );
}
