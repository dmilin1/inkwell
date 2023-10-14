import { createContext, useState } from 'react';
import { Ebook, Metadata } from '../models/Ebook';
import { LoadLibraryParams } from './LibraryContext';


type EbookContext = {
    ebook?: Ebook,
    metadata?: Metadata,
    changeEbook: (newEbook?: Ebook, loadOptions?: LoadLibraryParams) => void,
    refreshProgress: () => void,
};

export const EbookContext = createContext<EbookContext>({
    changeEbook: () => {},
    refreshProgress: () => {},
});

export function EbookProvider({ children }: React.PropsWithChildren) {
    const [ebook, setEbook] = useState<Ebook | undefined>();
    const [metadata, setMetadata] = useState<Metadata | undefined>();

    const changeEbook = async (newEbook?: Ebook, loadOptions: LoadLibraryParams = {}) => {
        const newMetadata = newEbook ? await newEbook.loadMetadata(loadOptions) : undefined;
        setMetadata(newMetadata);
        setEbook(newEbook);
        newEbook?.setStats({ lastOpenedAt: Date.now() });
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
            refreshProgress,
        }}>
            {children}
        </EbookContext.Provider>
    );
}