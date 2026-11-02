import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Chapters, SaveSpot } from '../models/Ebook';
import { EbookContext } from './EbookContext';
import { Loader } from '../components/Loader/Loader';
import { ReadingPosition, capturePosition, findAnchorElement, scrollElementToTop } from '../utils/ReadingPosition';
import { errorMessage } from './LibraryContext';

/** Where to land when a chapter opens, instead of the saved spot. */
export type ChapterTarget = {
    /** Element id to scroll to. */
    anchor?: string,
    /** Open at the end of the chapter (going back a chapter). */
    atEnd?: boolean,
};

interface ChapterContext {
    chapters?: Chapters,
    numberOfChapters: number,
    chapterIndex?: number,
    html: HTMLElement[],
    isChapterSelectOpen: boolean,
    setChapterSelectOpen: (newVal: boolean) => void,
    /** Opens chapter `index`, at its start unless a target is given. */
    setChapterIndex: (index: number, target?: ChapterTarget) => void,
    /** The target for `index` requested via setChapterIndex, if any (consumed on read). */
    takeChapterTarget: (index: number) => ChapterTarget | undefined,
    saveSpot: (position?: ReadingPosition) => Promise<void>,
    loadSpot: () => Promise<SaveSpot|undefined>,
};

export const ChapterContext = createContext<ChapterContext>({
    numberOfChapters: 1,
    html: [],
    isChapterSelectOpen: false,
    setChapterSelectOpen: () => {},
    setChapterIndex: () => {},
    takeChapterTarget: () => undefined,
    saveSpot: () => new Promise(() => null),
    loadSpot: () => new Promise(() => null),
});

export function ChapterProvider({ children }: React.PropsWithChildren) {
    const { ebook, refreshProgress, changeEbook } = useContext(EbookContext);

    const [chapters, setChapters] = useState<Chapters>();
    const [chapterIndex, setChapterIndexState] = useState<number>();
    const [html, setHTML] = useState<HTMLElement[]>([]);
    const pendingTarget = useRef<{ index: number } & ChapterTarget>();

    const [isChapterSelectOpen, setChapterSelectOpen] = useState<boolean>(false);

    const goToChapter = (index: number, target?: ChapterTarget) => {
        const count = chapters?.ordered().length ?? 1;
        const newIndex = Math.max(0, Math.min(count - 1, index));
        pendingTarget.current = target ? { index: newIndex, ...target } : undefined;
        setChapterIndexState(newIndex);
    }

    const takeChapterTarget = (index: number) => {
        const target = pendingTarget.current;
        if (target?.index !== index) {
            return undefined;
        }
        pendingTarget.current = undefined;
        return target;
    }

    const scrollToAnchor = (anchor: string) => {
        const container = document.getElementById('reader-container');
        const contents = document.getElementById('reader-contents-container');
        const element = contents && findAnchorElement(contents, anchor);
        if (container && element) {
            scrollElementToTop(container, element);
        }
    }

    const loadChapter = async (index: number) => {
        setChapters(undefined);
        try {
            const ebookChapters = await ebook!.loadChapters();
            const count = ebookChapters.ordered().length;
            if (index >= count) {
                // e.g. a saved spot from a different version of the book.
                setChapterIndexState(count - 1);
                return;
            }
            const html = await ebookChapters.index(index)!.loadHTML({
                changeChapter: (newChapter, anchor) => {
                    pendingTarget.current = { index: newChapter.index, anchor };
                    setChapterIndexState(newChapter.index);
                },
                scrollToAnchor,
            });
            setHTML(html);
            setChapters(ebookChapters);
        } catch (e) {
            console.error(e);
            alert('Ebook failed to load: ' + errorMessage(e));
            changeEbook(undefined);
        }
    }

    /**
     * Saves the current reading spot. The reader passes the position it is
     * tracking; otherwise it is captured from the DOM.
     */
    const saveSpot = async (position?: ReadingPosition) => {
        const container = document.getElementById('reader-container');
        const contents = document.getElementById('reader-contents-container');
        if (!position && container && contents) {
            position = capturePosition(container, contents);
        }
        await ebook?.saveSpot({
            chapterIndex: chapterIndex ?? 0,
            scrollHeight: container?.scrollTop ?? 0,
            percentComplete: calcProgressPercent(),
            position,
        });
        refreshProgress();
    }

    const loadSpot = async (): Promise<SaveSpot|undefined> => {
        return await ebook?.loadSpot();
    }

    const calcProgressPercent = (): number => {
        if (chapterIndex === undefined || !chapters) {
            return 0;
        }
        const ordered = chapters.ordered();
        const totalEbookSize = ordered.reduce((sum, chapter) => sum + chapter.size, 0);
        if (totalEbookSize <= 0) {
            return 0;
        }
        const container = document.getElementById('reader-container');
        const maxScroll = container ? container.scrollHeight - container.clientHeight : 0;
        // Fully scrolled (or nothing to scroll) means the chapter has been read.
        const chapterProgress = maxScroll > 0
            ? Math.min(1, Math.max(0, container!.scrollTop / maxScroll))
            : 1;
        const progress = ordered.reduce((sum, chapter) => {
            if (chapter.index < chapterIndex) {
                return sum + chapter.size;
            }
            if (chapter.index === chapterIndex) {
                return sum + chapterProgress * chapter.size;
            }
            return sum;
        }, 0) / totalEbookSize;
        return Math.min(1, progress);
    }

    useEffect(() => {
        (async () => {
            const spot = await loadSpot();
            setChapterIndexState(spot?.chapterIndex ?? 0);
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
            html,
            isChapterSelectOpen,
            setChapterSelectOpen,
            setChapterIndex: goToChapter,
            takeChapterTarget,
            saveSpot,
            loadSpot,
        }}>
            { ebook && !chapters ? <Loader/> : children }
        </ChapterContext.Provider>
    );
}
