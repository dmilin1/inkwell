import { StyleHTMLAttributes, useContext, useEffect, useMemo, useRef } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { ChapterContext } from "../../contexts/ChapterContext";
import { StatusBar } from "../../utils/StatusBar";
import { ScrollPull } from "../../components/ScrollPull/ScrollPull";
import { useDebounce } from "../../utils/Debounce";
import getSafeArea from "../../utils/SafeArea";

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
    htmlContainer.current = ref;
    ref.innerHTML = '';
    html!.forEach(child => ref?.appendChild(child));
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
    if ((chapterIndex ?? 0) - (prevChapterIndex ?? 0) === -1) {
      outerContainer.current?.scrollTo({ top: Number.MAX_VALUE });
    } else if (spot && chapterIndex === spot.chapterIndex) {
      outerContainer.current?.scrollTo({ top: spot.scrollHeight });
    } else {
      outerContainer.current?.scrollTo({ top: 0 });
      saveSpot();
    }
  };

  const changeChapter = async (i: number) => {
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
    saveSpot();
    alignProgressIndicator();
  }, [outerContainer.current]);

  const debouncedScroll = useDebounce('scroll-save', 250, () => {
    saveSpot();
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
            const touchX = e.pageX;
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
          debouncedScroll.current?.();
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
