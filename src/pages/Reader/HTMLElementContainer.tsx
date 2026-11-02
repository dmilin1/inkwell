import { StyleHTMLAttributes, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { ChapterContext } from "../../contexts/ChapterContext";
import { StatusBar } from "../../utils/StatusBar";
import { ScrollPull } from "../../components/ScrollPull/ScrollPull";
import { useDebounce } from "../../utils/Debounce";
import getSafeArea from "../../utils/SafeArea";
import { ReadingPosition, capturePosition, resetPositionCache, restorePosition } from "../../utils/ReadingPosition";

type TrackedPosition = {
  chapterIndex?: number,
  value?: ReadingPosition,
  /** Width of the text column when `value` was captured; a change means the text reflowed. */
  width: number,
};

let progressIndicatorOpacityTimout : NodeJS.Timeout|undefined = undefined;

export function HTMLElementContainer() {
  const {
    html, chapterIndex, prevChapterIndex, numberOfChapters,
    setChapterIndex, saveSpot, loadSpot
  } = useContext(ChapterContext);
  const { settings, setIsSettingsOpen } = useContext(SettingsContext);

  const outerContainer = useRef<HTMLDivElement>(null);
  const htmlContainer = useRef<HTMLDivElement>();

  const textIsHighlighted = useRef(false);

  /**
   * The spot the user last scrolled to, stored independently of layout so it
   * can be restored when the text reflows (iPhone Duo fold/unfold, rotation,
   * window resize, font or margin changes).
   */
  const position = useRef<TrackedPosition>({ width: 0 });
  /** The scrollTop we last set ourselves; scroll events landing there aren't user scrolls. */
  const programmaticScrollTop = useRef<number>();
  /** True while chapter contents are being (re)built and the spot restored. */
  const isRestoring = useRef(false);
  /** Incremented per build so an older, still-pending build doesn't restore over a newer one. */
  const buildId = useRef(0);

  /** Re-render on viewport changes so safe-area insets (which can differ per display) are re-read. */
  const [, setViewportSize] = useState(() => `${window.innerWidth}x${window.innerHeight}`);

  const {
    fontFamily, fontSize, fontWeight, lineSpacing, wordSpacing, letterSpacing,
    paragraphSpacing, paragraphIndentation, fontColor, backgroundColor,
    verticalMargins: verticalMarginsSetting, horizontalMargins, statusBar
  } = settings;

  const safeArea = getSafeArea();
  const marginTop = verticalMarginsSetting + (settings.readingMode === 'paginated' ? safeArea.top : 0);
  const marginBottom = verticalMarginsSetting + (settings.readingMode === 'paginated' ? safeArea.bottom : 0);
  const verticalMarginTotal = marginTop + marginBottom;

  StatusBar.set(statusBar);

  const backgroundStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: backgroundColor,
    zIndex: 0,
  }

  const outerContainerStyles = {
    paddingLeft: `${horizontalMargins}px`,
    paddingRight: `${horizontalMargins}px`,
    paddingTop: `${settings.readingMode === 'paginated' ? 0 : safeArea.top}px`,
    marginTop: `${marginTop}px`,
    marginBottom: `${marginBottom}px`,
    backgroundColor: backgroundColor,
    fontSize: `${fontSize}px`,
    fontWeight: fontWeight,
    wordSpacing: `${(wordSpacing - 1) / 4}em`,
    letterSpacing: `${(letterSpacing - 1) / 10}em`,
    hyphens: 'auto',
    userSelect: 'text',
    zIndex: 10,
    color: fontColor,
    fontFamily,
    overflow: settings.readingMode === 'scrolling' ? 'scroll' : 'hidden',
    // We keep the reading position ourselves (see realign); browser scroll
    // anchoring (Chromium/Android only) would fight it.
    overflowAnchor: 'none',
    height: `calc(100vh - ${verticalMarginTotal}px)`,
    display: 'block',
    // 'background-image': 'url("https://www.tilingtextures.com/wp-content/uploads/2018/11/0066-768x768.jpg")',
    // 'background-size': 'auto',
    // 'background-repeat': 'repeat',
  };

  const innerContainerStyles = {
    /**
     * This element needs to be big enough to cause the outer container to be
     * scrollable before the html in inserted, or scroll breaks on iOS due to
     * a bug with webkit rendering.
     */
    minHeight: '105vh',
  };

  const elementStyles = {
    'span': {
      // 'display': 'contents',
    },
    'a[href]': {
      'text-decoration': 'underline',
    },
    'h1, h2': {
      'text-align': 'center',
      'margin': '2rem',
    },
    'h1, h2 span': {
      'font-weight': '600',
      'font-size': `${1.3 * fontSize}px`,
    },
    'image, img': {
      'margin': 'auto',
    },
    'p': {
      'text-indent': `${paragraphIndentation}rem`,
      'line-height': lineSpacing,
      'margin-bottom': `${paragraphSpacing}px`,
      'hyphens': 'auto',
    },
    'div': {
      'display': 'block',
    }
  };

  const buildElements = async (ref: HTMLDivElement) => {
    if (!ref) {
      return;
    }
    /**
     * If this chapter is already on screen (we're rebuilding because a setting
     * or the safe area changed), keep the reader where it was. Snapshot it now,
     * before the DOM changes underneath it.
     */
    const tracked = position.current.chapterIndex === chapterIndex ? position.current.value : undefined;
    const id = ++buildId.current;
    isRestoring.current = true;
    htmlContainer.current = ref;
    ref.innerHTML = '';
    html!.forEach(child => ref?.appendChild(child));
    resetPositionCache(ref);
    for (let [selector, styles] of Object.entries(elementStyles)) {
      ref.querySelectorAll<HTMLElement>(selector).forEach(elem =>
        Object.assign(elem.style, styles)
      );
    }
    /**
     * This next line fixes a bug on safari where the parent scroll container
     * will become unscrollable because the browser thinks the content is still
     * too small to scroll. getBoundingClientRect() forces the browser to trigger
     * a reflow and recalculate the scroll height. Then we console log it so
     * our transpiler doesn't remove it.
     */
    /* DO NOT REMOVE */console.log(ref.getBoundingClientRect());/* DO NOT REMOVE */
    const spot = await loadSpot();
    /**
     * Restore in the final layout: the reader font may still be loading (the
     * first time it's used in a session), and the text reflows once it arrives.
     * Spots saved as pixel offsets by older versions only match the final layout.
     */
    await Promise.race([
      document.fonts?.ready,
      new Promise(resolve => setTimeout(resolve, 1000)),
    ]);
    const container = outerContainer.current;
    if (id !== buildId.current) {
      // Superseded by a newer build while we were loading the spot.
      return;
    }
    if (!container) {
      isRestoring.current = false;
      return;
    }
    let restoredFrom: ReadingPosition | undefined;
    if (tracked) {
      restorePosition(container, ref, tracked);
      restoredFrom = tracked;
    } else if ((chapterIndex ?? 0) - (prevChapterIndex ?? 0) === -1) {
      container.scrollTo({ top: Number.MAX_VALUE });
    } else if (spot && chapterIndex === spot.chapterIndex) {
      restorePosition(container, ref, spot.position, spot.scrollHeight);
      restoredFrom = spot.position?.anchor ? spot.position : undefined;
    } else {
      container.scrollTo({ top: 0 });
    }
    programmaticScrollTop.current = container.scrollTop;
    position.current = {
      chapterIndex,
      // Keep the original anchor rather than re-capturing it, so repeated
      // reflows can't drift the position.
      value: restoredFrom ?? capturePosition(container, ref),
      width: ref.clientWidth,
    };
    isRestoring.current = false;
    alignProgressIndicator();
    saveSpot(position.current.value);
  };

  /**
   * Called when the reader or its contents changed size: the viewport changed
   * (fold/unfold, rotation, window resize) or the text reflowed for another
   * reason (fonts or images finishing loading). Scroll back to the tracked spot.
   */
  const realign = () => {
    const container = outerContainer.current;
    const contents = htmlContainer.current;
    if (!container || !contents || isRestoring.current || contents.clientWidth === 0) {
      return;
    }
    position.current.width = contents.clientWidth;
    if (!position.current.value || position.current.chapterIndex !== chapterIndex) {
      return;
    }
    const previousScrollTop = container.scrollTop;
    programmaticScrollTop.current = restorePosition(container, contents, position.current.value);
    if (programmaticScrollTop.current !== previousScrollTop) {
      alignProgressIndicator();
      debouncedScroll.current?.();
    }
  };
  const realignRef = useRef(realign);
  realignRef.current = realign;

  /** Records the spot the user has scrolled to. */
  const trackScroll = () => {
    const container = outerContainer.current;
    const contents = htmlContainer.current;
    if (!container || !contents || isRestoring.current) {
      return;
    }
    if (contents.clientWidth !== position.current.width) {
      // This scroll came from a reflow (e.g. the device was folded), not the user.
      realign();
      return;
    }
    if (
      programmaticScrollTop.current !== undefined
      && Math.abs(container.scrollTop - programmaticScrollTop.current) < 1
    ) {
      return;
    }
    programmaticScrollTop.current = undefined;
    position.current = {
      chapterIndex,
      value: capturePosition(container, contents),
      width: contents.clientWidth,
    };
  };

  const changeChapter = async (i: number) => {
    if (chapterIndex !== i && i >= 0 && i < numberOfChapters) {
      // The tracked spot belongs to the chapter we're leaving, and scrolls from
      // clearing the old contents must not be saved.
      position.current = { width: 0 };
      isRestoring.current = true;
    }
    if (
      htmlContainer.current
      && outerContainer.current
      && chapterIndex !== i
      && i >= 0
      && i < (numberOfChapters) - 1
    ) {
      htmlContainer.current.style.opacity = '0';
      htmlContainer.current.innerHTML = '';
    }
    setTimeout(() => {
      setChapterIndex(i)
    }, 100)
  }

  const alignProgressIndicator = () => {
    const indicator = document.querySelector('#progress-indicator') as HTMLElement|null;
    const container = document.querySelector('#reader-container') as HTMLElement|null;
    const contents = document.querySelector('#reader-contents-container') as HTMLElement|null;
    if (!indicator || !container || !contents) return;
    const containerBounds = container.getBoundingClientRect();
    const contentsBounds = contents.getBoundingClientRect();
    const relativeSize = containerBounds.height / contentsBounds.height;
    indicator.style.opacity = '50%';
    indicator.style.backgroundColor = settings.fontColor;
    indicator.style.height = `${relativeSize * 100}%`;
    indicator.style.top = `${(container.scrollTop / contentsBounds.height) * (containerBounds.height - marginBottom) + containerBounds.top}px`;
    clearTimeout(progressIndicatorOpacityTimout);
    progressIndicatorOpacityTimout = setTimeout(() => {
      indicator.style.opacity = '0%';
    }, 1000);
  }

  useEffect(() => {
    if (htmlContainer.current?.children) {
      htmlContainer.current.style.opacity = '1';
    }
  });

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        changeChapter(chapterIndex! - 1);
      }
      if (e.key === 'ArrowRight') {
        changeChapter(chapterIndex! + 1);
      }
    }
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, []);

  useEffect(() => {
    // The spot is saved by buildElements once it has been restored; saving here
    // would race with (and could overwrite) the spot before it's loaded.
    alignProgressIndicator();
  }, [outerContainer.current]);

  useEffect(() => {
    /**
     * Folding/unfolding the iPhone Duo, rotating, or resizing the window
     * changes the reader's size and reflows the text. The contents can also
     * change height on their own (fonts or images finishing loading).
     * ResizeObserver callbacks run after layout but before paint, so the
     * correction is never visible.
     */
    let frame: number | undefined;
    const onResize = () => {
      realignRef.current();
      if (frame === undefined) {
        frame = requestAnimationFrame(() => {
          frame = undefined;
          setViewportSize(`${window.innerWidth}x${window.innerHeight}`);
        });
      }
    };
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : undefined;
    if (outerContainer.current) {
      observer?.observe(outerContainer.current);
    }
    if (htmlContainer.current) {
      observer?.observe(htmlContainer.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };
  }, []);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const debouncedScroll = useDebounce('scroll-save', 250, () => {
    // The reader unmounts while a new chapter loads. A save still pending from
    // the old chapter would overwrite the new chapter's spot with the old index.
    if (!isMounted.current) {
      return;
    }
    saveSpot(position.current.chapterIndex === chapterIndex ? position.current.value : undefined);
  });

  return useMemo(() =>
    <>
      {settings.scrollBar === 'untouchable' &&
        <div
          id='progress-indicator'
          className='opacity-50 z-20 w-[3px] absolute right-0 rounded'
          style={{
            transition: 'opacity 0.5s',
          }}
        />
      }
      <div
        id='reader-container'
        ref={outerContainer}
        className={`overscroll-none ${settings.scrollBar !== 'visible' ? 'scrollbar-hide' : ''}`}
        style={outerContainerStyles as StyleHTMLAttributes<any>}
        onTouchStart={e => {
          textIsHighlighted.current = !!document.getSelection()?.toString();
        }}
        onClick={e => {
          if (textIsHighlighted.current || document.getSelection()?.toString()) {
            return
          }
          if (settings.readingMode === 'paginated') {
            const containerBounds = outerContainer.current?.getBoundingClientRect();
            const containerScroll = outerContainer.current?.scrollTop ?? 0;
            const touchWidth = containerBounds?.width ?? 0;
            const pageHeight = (containerBounds?.height ?? 0);
            const pageHeightBuffer = 10;
            const edgeTouchSize = touchWidth / 4;
            const touchX = e.clientX - (containerBounds?.left ?? 0);
            if (touchX < edgeTouchSize) {
              outerContainer.current?.scrollTo({ top: containerScroll - pageHeight + pageHeightBuffer });
              return;
            }
            if (touchX > touchWidth - edgeTouchSize) {
              outerContainer.current?.scrollTo({ top: containerScroll + pageHeight - pageHeightBuffer });
              return;
            }
          }
          setIsSettingsOpen((prevState) => !prevState);
        }}
        onScroll={() => {
          trackScroll();
          if (!isRestoring.current) {
            debouncedScroll.current?.();
          }
          alignProgressIndicator();
        }}
        tabIndex={0}
      >
        <ScrollPull
          pulledUp={() => changeChapter(chapterIndex! - 1) }
          pulledDown={() => changeChapter(chapterIndex! + 1)}
          atBeginning={chapterIndex === 0}
          atEnd={chapterIndex === numberOfChapters - 1}
        >
          <div
            id='reader-contents-container'
            ref={buildElements}
            className='padding-safe-area-bottom transition-opacity opacity-0 duration-[1000ms]'
            style={innerContainerStyles}
          />
        </ScrollPull>
      </div>
      <div style={backgroundStyles}/>
    </>
  , [settings, html, ...Object.values(safeArea)]);
}
