import { StyleHTMLAttributes, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { ChapterContext } from "../../contexts/ChapterContext";
import { StatusBar, StatusBarMode } from "../../utils/StatusBar";
import { isLightColor } from "../../utils/Themes";
import { updateImageInversion } from "../../utils/ImageInversion";
import { fontStack } from "../../resources/fonts/fonts";
import { ScrollPull } from "../../components/ScrollPull/ScrollPull";
import { useDebounce } from "../../utils/Debounce";
import getSafeArea from "../../utils/SafeArea";
import {
  ReadingPosition, capturePosition, findAnchorElement, pageLineBounds, resetPositionCache, restorePosition, scrollElementToTop,
} from "../../utils/ReadingPosition";

type TrackedPosition = {
  chapterIndex?: number,
  value?: ReadingPosition,
  /** Width of the text column when `value` was captured; a change means the text reflowed. */
  width: number,
};

/** Maximum text column width per "Line length" setting (in em, so it holds a similar number of characters at any size). */
const LINE_LENGTHS: { [length: string]: string } = {
  narrow: '28em',
  medium: '34em',
  wide: '42em',
  full: 'none',
};

let progressIndicatorOpacityTimout : NodeJS.Timeout|undefined = undefined;

export function HTMLElementContainer() {
  const {
    html, chapterIndex, numberOfChapters, takeChapterTarget,
    setChapterIndex, saveSpot, loadSpot
  } = useContext(ChapterContext);
  const { settings, isSettingsOpen, setIsSettingsOpen } = useContext(SettingsContext);
  // Read by the memoized tap handler.
  const settingsOpen = useRef(isSettingsOpen);
  settingsOpen.current = isSettingsOpen;

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

  // Status bar text follows the page color so it's always readable.
  const statusBarMode = statusBar === StatusBarMode.Hidden
    ? StatusBarMode.Hidden
    : isLightColor(backgroundColor) ? StatusBarMode.Light : StatusBarMode.Dark;
  useEffect(() => {
    StatusBar.set(statusBarMode);
  }, [statusBarMode]);

  const backgroundStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
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
    fontFamily: fontStack(fontFamily),
    lineHeight: lineSpacing,
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
    // Keep lines to a comfortable length on wide screens (e.g. an unfolded phone).
    width: '100%',
    maxWidth: LINE_LENGTHS[settings.lineLength] ?? LINE_LENGTHS.medium,
    marginLeft: 'auto',
    marginRight: 'auto',
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
    'img': {
      'max-width': '100%',
      'height': 'auto',
    },
    'p': {
      'text-indent': `${paragraphIndentation}em`,
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
    updateImageInversion(ref, settings.invertImages && !isLightColor(backgroundColor));
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
    // Read only now: a build that gets superseded must not consume it.
    const target = takeChapterTarget(chapterIndex ?? 0);
    const anchorElement = target?.anchor ? findAnchorElement(ref, target.anchor) : null;
    let restoredFrom: ReadingPosition | undefined;
    if (tracked) {
      restorePosition(container, ref, tracked);
      restoredFrom = tracked;
    } else if (anchorElement) {
      scrollElementToTop(container, anchorElement);
    } else if (target?.atEnd) {
      container.scrollTop = container.scrollHeight;
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
    pageHistory.current = [];
    updatePageMask();
    alignProgressIndicator();
    saveSpot(position.current.value);
  };

  /**
   * Called when the reader or its contents changed size: the viewport changed
   * (fold/unfold, rotation, window resize) or the text reflowed for another
   * reason (fonts or images finishing loading). Scroll back to the tracked spot.
   */
  const pageMaskTop = useRef<HTMLDivElement>(null);
  const pageMaskBottom = useRef<HTMLDivElement>(null);
  const pageMaskStyles: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    width: '100vw',
    zIndex: 15,
    pointerEvents: 'none',
  };
  /** scrollTops of the pages before this one, so "previous page" returns exactly. */
  const pageHistory = useRef<number[]>([]);

  /** Paginated mode: cover partial lines at the top and bottom edges of the page. */
  const updatePageMask = () => {
    const top = pageMaskTop.current;
    const bottom = pageMaskBottom.current;
    const container = outerContainer.current;
    const contents = htmlContainer.current;
    if (!top || !bottom) {
      return;
    }
    top.style.display = 'none';
    bottom.style.display = 'none';
    if (settings.readingMode !== 'paginated' || !container || !contents || isRestoring.current) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const { firstLineTop, cutLineTop } = pageLineBounds(container, contents);
    if (firstLineTop !== undefined && firstLineTop > rect.top + 1 && firstLineTop < rect.bottom) {
      top.style.display = 'block';
      top.style.top = `${rect.top}px`;
      top.style.height = `${firstLineTop - rect.top}px`;
    }
    if (cutLineTop !== undefined && cutLineTop > rect.top) {
      bottom.style.display = 'block';
      bottom.style.top = `${cutLineTop}px`;
      bottom.style.height = `${rect.bottom - cutLineTop}px`;
    }
  };
  const updatePageMaskRef = useRef(updatePageMask);
  updatePageMaskRef.current = updatePageMask;

  /** Paginated mode: the next page starts with the line that was cut off. */
  const turnPage = (direction: 1 | -1) => {
    const container = outerContainer.current;
    const contents = htmlContainer.current;
    if (!container || !contents) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const maxScroll = container.scrollHeight - container.clientHeight;
    if (direction === 1) {
      if (container.scrollTop >= maxScroll - 1) {
        changeChapter((chapterIndex ?? 0) + 1);
        return;
      }
      // Start the next page at the line that was cut off, or at the next line
      // below the page when nothing was cut.
      const { cutLineTop, nextLineTop } = pageLineBounds(container, contents);
      const nextPageTop = cutLineTop ?? nextLineTop;
      const minimumStep = fontSize * lineSpacing * 2;
      const step = nextPageTop !== undefined && nextPageTop - rect.top > minimumStep
        ? nextPageTop - rect.top
        : rect.height;
      pageHistory.current.push(container.scrollTop);
      container.scrollTop += step;
    } else {
      if (container.scrollTop <= 1) {
        changeChapter((chapterIndex ?? 0) - 1);
        return;
      }
      const previous = pageHistory.current.pop();
      if (previous !== undefined && previous < container.scrollTop) {
        container.scrollTop = previous;
      } else {
        pageHistory.current = [];
        container.scrollTop = Math.max(0, container.scrollTop - rect.height);
        if (container.scrollTop > 0) {
          // Start the page on a whole line.
          restorePosition(container, contents, capturePosition(container, contents));
        }
      }
    }
    updatePageMask();
  };

  const realign = () => {
    const container = outerContainer.current;
    const contents = htmlContainer.current;
    if (!container || !contents || isRestoring.current || contents.clientWidth === 0) {
      return;
    }
    position.current.width = contents.clientWidth;
    if (!position.current.value || position.current.chapterIndex !== chapterIndex) {
      updatePageMask();
      return;
    }
    const previousScrollTop = container.scrollTop;
    programmaticScrollTop.current = restorePosition(container, contents, position.current.value);
    if (programmaticScrollTop.current !== previousScrollTop) {
      pageHistory.current = [];
      alignProgressIndicator();
      debouncedScroll.current?.();
    }
    updatePageMask();
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
      && i < numberOfChapters
    ) {
      htmlContainer.current.style.opacity = '0';
      htmlContainer.current.innerHTML = '';
    }
    // Going back a chapter continues from its end.
    const target = i === (chapterIndex ?? 0) - 1 ? { atEnd: true } : undefined;
    setTimeout(() => {
      setChapterIndex(i, target)
    }, 100)
  }

  /**
   * The scroll bar is drawn by the app: iOS WebKit always auto-hides native
   * scroll bars, whatever the CSS says.
   */
  const scrollbarGeometry = () => {
    const container = outerContainer.current;
    if (!container) {
      return undefined;
    }
    const bounds = container.getBoundingClientRect();
    const trackTop = bounds.top + (parseFloat(getComputedStyle(container).paddingTop) || 0);
    const trackHeight = bounds.bottom - trackTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const thumbHeight = Math.min(trackHeight, Math.max(40, trackHeight * container.clientHeight / container.scrollHeight));
    return { container, trackTop, trackHeight, maxScroll, thumbHeight };
  };

  const alignProgressIndicator = () => {
    const indicator = document.getElementById('progress-indicator');
    const geometry = scrollbarGeometry();
    if (!indicator || !geometry) {
      return;
    }
    const { container, trackTop, trackHeight, maxScroll, thumbHeight } = geometry;
    const ratio = maxScroll > 0 ? container.scrollTop / maxScroll : 0;
    indicator.style.top = `${trackTop + ratio * (trackHeight - thumbHeight)}px`;
    indicator.style.height = `${thumbHeight}px`;
    indicator.style.opacity = '1';
    clearTimeout(progressIndicatorOpacityTimout);
    if (settings.scrollBar === 'untouchable') {
      progressIndicatorOpacityTimout = setTimeout(() => {
        indicator.style.opacity = '0';
      }, 1000);
    }
  }

  /** "Show" mode: the scroll bar's thumb can be dragged. */
  const scrollbarDrag = useRef<{ grabOffset: number } | null>(null);
  const dragScrollbar = (clientY: number) => {
    const geometry = scrollbarGeometry();
    if (!geometry || !scrollbarDrag.current) {
      return;
    }
    const { container, trackTop, trackHeight, maxScroll, thumbHeight } = geometry;
    const travel = trackHeight - thumbHeight;
    const ratio = travel > 0 ? (clientY - scrollbarDrag.current.grabOffset - trackTop) / travel : 0;
    container.scrollTop = Math.min(1, Math.max(0, ratio)) * maxScroll;
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
  const latest = useRef({ saveSpot, chapterIndex });
  latest.current = { saveSpot, chapterIndex };
  // A layout effect, so the cleanup runs while the reader is still in the DOM
  // (saveSpot measures it); passive effect cleanups run after it's removed.
  useLayoutEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      /**
       * Save right away when the reader closes, rather than dropping a save
       * that's still debounced. Skipped while changing chapters: the tracked
       * spot belongs to the chapter being left.
       */
      if (
        !isRestoring.current
        && position.current.value
        && position.current.chapterIndex === latest.current.chapterIndex
      ) {
        latest.current.saveSpot(position.current.value);
      }
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
      {settings.readingMode === 'scrolling' && settings.scrollBar !== 'hidden' &&
        <div
          id='progress-indicator'
          role='scrollbar'
          aria-controls='reader-container'
          aria-orientation='vertical'
          className='absolute z-20 w-7 flex justify-end'
          style={{
            right: 'var(--sar)',
            transition: 'opacity 0.5s',
            opacity: 0,
            pointerEvents: settings.scrollBar === 'visible' && settings.scrollBarDraggable ? 'auto' : 'none',
            touchAction: 'none',
          }}
          onPointerDown={e => {
            e.preventDefault();
            e.stopPropagation();
            scrollbarDrag.current = { grabOffset: e.clientY - e.currentTarget.getBoundingClientRect().top };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={e => dragScrollbar(e.clientY)}
          onPointerUp={() => { scrollbarDrag.current = null; }}
          onPointerCancel={() => { scrollbarDrag.current = null; }}
          onClick={e => e.stopPropagation()}
        >
          <div className='w-1 h-full mr-1 rounded-full opacity-40' style={{ backgroundColor: fontColor }} />
        </div>
      }
      <div
        id='reader-container'
        ref={outerContainer}
        className='overscroll-none scrollbar-hide'
        style={outerContainerStyles as StyleHTMLAttributes<any>}
        onTouchStart={e => {
          textIsHighlighted.current = !!document.getSelection()?.toString();
        }}
        onClick={e => {
          if (textIsHighlighted.current || document.getSelection()?.toString()) {
            return
          }
          if (settingsOpen.current) {
            // A tap anywhere on the page just closes the menu.
            setIsSettingsOpen(false);
            return;
          }
          if (settings.readingMode === 'paginated') {
            const containerBounds = outerContainer.current?.getBoundingClientRect();
            const touchWidth = containerBounds?.width ?? 0;
            const edgeTouchSize = touchWidth / 3;
            const touchX = e.clientX - (containerBounds?.left ?? 0);
            if (touchX < edgeTouchSize) {
              turnPage(-1);
              return;
            }
            if (touchX > touchWidth - edgeTouchSize) {
              turnPage(1);
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
      {/* Paginated mode: hide lines cut off by the top or bottom edge of the page. */}
      <div ref={pageMaskTop} className='hidden' style={{ ...pageMaskStyles, backgroundColor }} />
      <div ref={pageMaskBottom} className='hidden' style={{ ...pageMaskStyles, backgroundColor }} />
      <div style={backgroundStyles}/>
    </>
  , [settings, html, ...Object.values(safeArea)]);
}
