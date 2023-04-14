import { useContext } from 'react';
import { ChapterContext } from '../../contexts/ChapterContext';
import { faChevronLeft, faChevronRight, faGlasses } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SettingsContext } from '../../contexts/SettingsContext';


export default function ChapterSelect() {
  const {
    isChapterSelectOpen, setChapterSelectOpen, chapters,
    chapterIndex, setChapterIndex
  } = useContext(ChapterContext);
  const { setIsSettingsOpen } = useContext(SettingsContext);

  return (
    <div
      className='w-full h-full absolute z-[30] select-none'
      style={{ display: isChapterSelectOpen ? 'flex': 'none' }}
    >
      <div className='bg-bg-primary flex-row padding-safe-area-top justify-between'>
        <div
          className='w-16 text-center justify-center cursor-pointer'
          onClick={() => setChapterSelectOpen(false) }
        >
          <FontAwesomeIcon className='text-2xl' icon={faChevronLeft} />
        </div>
        <div className='h-14 space-b text-center text-lg justify-center'>Chapters</div>
        <div className='w-16'/>
      </div>
      <div className='bg-bg-secondary flex-1 padding-safe-area-bottom overflow-scroll'>
        <div className='divide-bg-primary divide-y-2'>
          {chapters?.ordered().map((chapter, i) =>
            <div
              key={chapter.index}
              className='h-16 px-6 justify-between items-center flex-row cursor-pointer'
              onClick={() => {
                setChapterIndex(i);
                setChapterSelectOpen(false);
                setIsSettingsOpen(false);
              }}
            >
              <div className='pr-4 line-clamp-2 flex-1 text-sm'>{i+1}) {chapter.title}</div>
              <div className='w-8'>
                <FontAwesomeIcon className='text-xl' icon={
                  chapterIndex === i ? faGlasses : faChevronRight
                }/>
              </div>
            </div>  
          )}
        </div>
      </div>
    </div>
  )
}