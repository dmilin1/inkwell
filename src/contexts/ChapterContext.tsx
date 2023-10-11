import { createContext, useContext, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Chapters, SaveSpot } from '../models/Ebook';
import { EbookContext } from './EbookContext';
import { Loader } from '../components/Loader/Loader';
import { usePrevious } from '../utils/UsePrevious';


interface ChapterContext {
    chapters?: Chapters,
    numberOfChapters: number,
    chapterIndex?: number,
    prevChapterIndex?: number,
    html: HTMLElement[],
    isChapterSelectOpen: boolean,
    setChapterSelectOpen: (newVal: boolean) => void,
    setChapterIndex: (index: number) => void,
    saveSpot: () => Promise<void>,
    loadSpot: () => Promise<SaveSpot|undefined>,
};

export const ChapterContext = createContext<ChapterContext>({
    numberOfChapters: 1,
    html: [],
    isChapterSelectOpen: false,
    setChapterSelectOpen: () => {},
    setChapterIndex: () => {},
    saveSpot: () => new Promise(() => null),
    loadSpot: () => new Promise(() => null),
});

export function ChapterProvider({ children }: React.PropsWithChildren) {
    const { ebook, refreshProgress, changeEbook } = useContext(EbookContext);

    const [chapters, setChapters] = useState<Chapters>();
    const [chapterIndex, setChapterIndex] = useState<number>();
    const [html, setHTML] = useState<HTMLElement[]>([]);

    const prevChapterIndex = usePrevious(chapterIndex);
    
    const [isChapterSelectOpen, setChapterSelectOpen] = useState<boolean>(false);


    const loadChapter = async (index: number) => {
        setChapters(undefined);
        try {
            let ebookChapters = await ebook?.loadChapters();
            const chapter = ebookChapters?.index(index)!;
            const html = await chapter?.loadHTML({
                changeChapter: (newChapter) => setChapterIndex(newChapter.index),
            });
            setHTML(html);
            setChapters(ebookChapters);
        } catch (e) {
            alert('Ebook failed to load: ' + e);
            changeEbook(undefined);
        }
    }

    const saveSpot = async () => {
        const scrollHeight = document.getElementById('reader-container')?.scrollTop;
        await ebook?.saveSpot({
            chapterIndex: chapterIndex ?? 0,
            scrollHeight: scrollHeight ?? 0,
            percentComplete: calcProgressPercent(),
        });
        refreshProgress();
    }

    const loadSpot = async (): Promise<SaveSpot|undefined> => {
        return await ebook?.loadSpot();
    }

    const calcProgressPercent = (): number => {
        if (!chapterIndex) {
            return 0;
        }
        const totalEbookSize = chapters?.ordered().reduce((sum, chapter) => (
            sum + chapter.size
        ), 0) ?? Number.MAX_SAFE_INTEGER;
        const progress = chapters?.ordered().reduce((sum, chapter) => {
            if (chapter.index < chapterIndex) {
                return sum + (chapter.size / totalEbookSize);
            }
            if (chapterIndex === chapter.index) {
                const scrollHeight = document.getElementById('reader-container')?.scrollTop ?? 0;
                const totalHeight = document.getElementById('reader-container')?.scrollHeight ?? 1;
                const chapterProgress = scrollHeight / totalHeight;return sum + chapterProgress * (chapter.size / totalEbookSize);
            }
            return sum
        }, 0) ?? 0;
        return progress;
    }

    useEffect(() => {
        (async () => {
            const spot = await loadSpot();
            setChapterIndex(spot?.chapterIndex ?? 0);
        })();
    }, []);

    useEffect(() => {
        if (ebook && chapterIndex != null) {
            loadChapter(chapterIndex);
        } else {
            setChapters(undefined);
            setHTML([]);
        }
    }, [chapterIndex, ebook]);

    
    return (
        <ChapterContext.Provider value={{
            chapters,
            numberOfChapters: chapters?.ordered().length ?? 1,
            chapterIndex,
            prevChapterIndex,
            html,
            isChapterSelectOpen,
            setChapterSelectOpen,
            setChapterIndex: (i) => {
                const newIndex = Math.max(0, Math.min((chapters?.ordered().length ?? 1) - 1, i))
                setChapterIndex(newIndex);
            },
            saveSpot,
            loadSpot,
        }}>
            { ebook && !chapters ? <Loader/> : children }
        </ChapterContext.Provider>
    );
}