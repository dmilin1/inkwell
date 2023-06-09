import { createContext, useState } from 'react';
import { Ebook, Metadata } from '../models/Ebook';


type EbookContext = {
    ebook?: Ebook,
    metadata?: Metadata,
    changeEbook: (newEbook?: Ebook) => void,
    refreshProgress: () => void,
};

export const EbookContext = createContext<EbookContext>({
    changeEbook: () => {},
    refreshProgress: () => {},
});

export function EbookProvider({ children }: React.PropsWithChildren) {
    const [ebook, setEbook] = useState<Ebook | undefined>();
    const [metadata, setMetadata] = useState<Metadata | undefined>();

    const changeEbook = async (newEbook?: Ebook) => {
        const newMetadata = newEbook ? await newEbook.loadMetadata() : undefined;
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