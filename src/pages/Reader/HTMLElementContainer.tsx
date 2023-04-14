import { StyleHTMLAttributes, useContext, useEffect, useMemo, useRef } from "react";
import { SettingsContext } from "../../contexts/SettingsContext";
import { ChapterContext } from "../../contexts/ChapterContext";
import { StatusBar } from "../../utils/StatusBar";
import { ScrollPull } from "../../components/ScrollPull/ScrollPull";
import { useDebounce } from "../../utils/Debounce";

export function HTMLElementContainer() {
  const {
    html, chapterIndex, prevChapterIndex, numberOfChapters,
    setChapterIndex, saveSpot, loadSpot
  } = useContext(ChapterContext);
  const { settings, setIsSettingsOpen } = useContext(SettingsContext);

  const outerContainer = useRef<HTMLDivElement>(null);
  const htmlContainer = useRef<HTMLDivElement>();

  const {
    fontFamily, fontSize, fontWeight, lineSpacing, wordSpacing, letterSpacing,
    paragraphSpacing, paragraphIndentation, fontColor, backgroundColor,
    verticalMargins, horizontalMargins, statusBar
  } = settings;

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
    marginTop: `${verticalMargins}px`,
    marginBottom: `${verticalMargins}px`,
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
    overflow: 'scroll',
    height: `calc(100vh - ${2*verticalMargins}px)`,
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

  useEffect(() => {
    if (htmlContainer.current?.innerText) {
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

  const debouncedScroll = useDebounce('scroll-save', 250, () => {
    saveSpot();
  });

  return useMemo(() =>
    <>
      <div
        id='reader-container'
        ref={outerContainer}
        className='padding-safe-area-top overscroll-none'
        style={outerContainerStyles as StyleHTMLAttributes<any>}
        onClick={() => setIsSettingsOpen((prevState) => !prevState)}
        onScroll={() => debouncedScroll.current?.()}
        tabIndex={0}
      >
        <ScrollPull
          pulledUp={() => changeChapter(chapterIndex! - 1)}
          pulledDown={() => changeChapter(chapterIndex! + 1)}
        >
          <div
            ref={buildElements}
            className='padding-safe-area-bottom transition-opacity opacity-0 duration-[1000ms]'
            style={innerContainerStyles}
          />
        </ScrollPull>
      </div>
      <div style={backgroundStyles}/>
    </>
  , [settings, html]);
}
