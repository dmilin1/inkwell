import { useContext, useEffect } from 'react';
import { ChapterContext } from '../../contexts/ChapterContext';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SettingsContext } from '../../contexts/SettingsContext';
import { useBackHandler } from '../../utils/BackButton';


export default function ChapterSelect() {
  const {
    isChapterSelectOpen, setChapterSelectOpen, chapters,
    chapterIndex, setChapterIndex
  } = useContext(ChapterContext);
  const { setIsSettingsOpen } = useContext(SettingsContext);

  useBackHandler(isChapterSelectOpen, () => setChapterSelectOpen(false));

  useEffect(() => {
    // Prefixed so it can't collide with element ids inside the book.
    document.getElementById(`chapter-select-${chapterIndex}`)?.scrollIntoView({ block: 'center' });
  }, [isChapterSelectOpen]);

  return (
    <div
      className='w-full h-full absolute z-40 select-none bg-bg-primary'
      style={{ display: isChapterSelectOpen ? 'flex': 'none' }}
    >
      <div className='padding-safe-area-top shadow-[0_1px_0_rgba(244,241,234,0.08)]'>
        <div className='flex-row items-center h-14 px-1'>
          <div className='w-12'/>
          <div className='flex-1 text-center font-display text-[1.05rem] font-semibold'>Contents</div>
          <button
            type='button'
            aria-label='Close contents'
            className='pressable w-12 h-12 flex items-center justify-center'
            onClick={() => setChapterSelectOpen(false)}
          >
            <FontAwesomeIcon className='text-xl' icon={faXmark} />
          </button>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto padding-safe-area-bottom'>
        <div className='w-full max-w-2xl self-center'>
          {chapters?.ordered().map((chapter, i) => {
            const isCurrent = chapterIndex === i;
            return (
              <button
                type='button'
                key={chapter.path}
                id={`chapter-select-${i}`}
                aria-current={isCurrent ? 'true' : undefined}
                className='pressable flex flex-row items-baseline gap-4 w-full text-left px-5 py-4 shadow-[inset_0_-1px_0_rgba(244,241,234,0.06)]'
                onClick={() => {
                  setChapterIndex(i);
                  setChapterSelectOpen(false);
                  setIsSettingsOpen(false);
                }}
              >
                <span className={`w-6 shrink-0 text-right text-sm tabular-nums ${isCurrent ? 'text-accent' : 'text-text-tertiary'}`}>
                  {i + 1}
                </span>
                <span className={`flex-1 line-clamp-2 leading-snug ${
                  isCurrent ? 'text-accent font-semibold' : chapter.title ? '' : 'italic text-text-secondary'
                }`}>
                  {chapter.title ?? 'Untitled section'}
                </span>
                {isCurrent && <span className='eyebrow text-accent shrink-0'>Reading</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  )
}
