import { useContext } from 'react';
import { Metadata } from '../../models/Ebook';
import Library from '../../models/Library';
import { EbookContext } from '../../contexts/EbookContext';
import { LibraryContext } from '../../contexts/LibraryContext';
import { ClickAndHold } from '../../components/ClickAndHold/ClickAndHold';
import { BookCover } from './BookCover';

function useBookActions(metadata: Metadata) {
  const { changeEbook } = useContext(EbookContext);
  const { promptToDeleteBook } = useContext(LibraryContext);
  return {
    open: async () => {
      const books = await Library.getBooks();
      changeEbook(books[metadata.filePath]);
    },
    remove: () => promptToDeleteBook(metadata.filePath),
  };
}

function ProgressBar({ value, thick = false, className = '' }: { value: number, thick?: boolean, className?: string }) {
  return (
    <div className={`${thick ? 'h-1' : 'h-[3px]'} rounded-full bg-line overflow-hidden ${className}`}>
      <div className='h-full rounded-full bg-accent' style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

/** A book in the library grid. Press and hold to remove it. */
export function BookTile({ metadata }: { metadata: Metadata }) {
  const { open, remove } = useBookActions(metadata);
  const progress = metadata.progress?.percentComplete ?? 0;

  return (
    <ClickAndHold onClick={open} onClickAndHold={remove}>
      <div className='cursor-pointer gap-2'>
        <BookCover metadata={metadata} />
        {progress > 0 && !metadata.error && <ProgressBar value={progress} className='mt-0.5' />}
        <div className='gap-0.5'>
          <div className='text-[0.85rem] font-medium leading-snug line-clamp-2 break-words'>{metadata.title}</div>
          <div className='text-xs text-text-secondary truncate'>
            {metadata.error ? "Couldn't read this file" : metadata.author}
          </div>
        </div>
      </div>
    </ClickAndHold>
  );
}

/** The book you were reading most recently. */
export function ContinueReading({ metadata }: { metadata: Metadata }) {
  const { open, remove } = useBookActions(metadata);
  const progress = metadata.progress?.percentComplete ?? 0;

  return (
    <section className='mt-7'>
      <div className='eyebrow text-text-secondary mb-3'>Continue reading</div>
      <ClickAndHold onClick={open} onClickAndHold={remove}>
        <div className='cursor-pointer flex-row items-center gap-4 rounded-2xl bg-bg-secondary p-4'>
          <BookCover metadata={metadata} size='sm' className='w-[4.5rem] shrink-0' />
          <div className='flex-1 min-w-0 gap-1'>
            <div className='font-display text-[1.15rem] font-semibold leading-tight line-clamp-2'>{metadata.title}</div>
            {metadata.author && <div className='text-sm text-text-secondary truncate'>{metadata.author}</div>}
            <div className='flex-row items-center gap-3 mt-3'>
              <ProgressBar value={progress} thick className='flex-1' />
              <div className='text-xs tabular-nums text-text-secondary'>{Math.round(progress * 100)}%</div>
            </div>
          </div>
        </div>
      </ClickAndHold>
    </section>
  );
}
