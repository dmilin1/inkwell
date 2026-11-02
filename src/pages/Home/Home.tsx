import { useContext, useEffect, useMemo, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { faMagnifyingGlass, faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StatusBar, StatusBarMode } from '../../utils/StatusBar.js';
import { LibraryContext } from '../../contexts/LibraryContext.js';
import splashImg from '../../resources/images/splash-icon.png';
import { FaderTransition } from '../../components/FaderTransition/FaderTransition.js';
import { Segmented } from '../../components/Controls/Controls';
import { Metadata } from '../../models/Ebook';
import { BookTile, ContinueReading } from './BookTile';

type Sort = 'recent' | 'title' | 'author';
const SORT_KEY = 'inkwell.librarySort';

let componentHasLoadedBefore = false;

/** Most recent activity first: opening a book or adding it. */
const recency = (metadata: Metadata) => Math.max(metadata.stats.lastOpenedAt, metadata.stats.addedAt);
const byText = (text?: string) => (text ?? '').replace(/^(the|a|an)\s+/i, '').toLocaleLowerCase();

function sortBooks(books: Metadata[], sort: Sort): Metadata[] {
  const sorted = [...books];
  switch (sort) {
    case 'recent':
      return sorted.sort((a, b) => recency(b) - recency(a));
    case 'title':
      return sorted.sort((a, b) => byText(a.title).localeCompare(byText(b.title)));
    case 'author':
      return sorted.sort((a, b) =>
        (a.author ?? '￿').localeCompare(b.author ?? '￿') || byText(a.title).localeCompare(byText(b.title))
      );
  }
}

function loadSort(): Sort {
  try {
    const saved = localStorage.getItem(SORT_KEY);
    return saved === 'title' || saved === 'author' ? saved : 'recent';
  } catch {
    return 'recent';
  }
}

function Home() {
  const { libraryLoading, ebooksMetadata, promptToAddBook } = useContext(LibraryContext);

  const [intialLoadComplete, setInitialLoadComplete] = useState(componentHasLoadedBefore);
  const [search, setSearch] = useState<string>('');
  const [sort, setSort] = useState<Sort>(loadSort);

  useEffect(() => {
    StatusBar.set(StatusBarMode.Dark);
  }, []);

  useEffect(() => {
    if (!libraryLoading) {
      componentHasLoadedBefore = true;
      SplashScreen.hide({ fadeOutDuration: 200 });
      setTimeout(() => setInitialLoadComplete(true), 200);
    }
  }, [libraryLoading]);

  const changeSort = (value: Sort) => {
    setSort(value);
    try {
      localStorage.setItem(SORT_KEY, value);
    } catch {
      // Only a preference; fine to lose.
    }
  };

  const query = search.trim().toLocaleLowerCase();
  const results = useMemo(() => sortBooks(
    query
      ? ebooksMetadata.filter(metadata =>
          metadata.title?.toLocaleLowerCase().includes(query)
          || metadata.author?.toLocaleLowerCase().includes(query)
        )
      : ebooksMetadata,
    sort,
  ), [ebooksMetadata, query, sort]);
  const continueReading = useMemo(() => ebooksMetadata
    .filter(metadata => metadata.stats.lastOpenedAt > 0 && !metadata.error)
    .sort((a, b) => b.stats.lastOpenedAt - a.stats.lastOpenedAt)[0],
  [ebooksMetadata]);

  return (
    <div className='h-full margin-safe-area-top select-none'>
      <FaderTransition
        shouldShow={!intialLoadComplete}
        style={{ position: 'fixed', inset: 0, zIndex: 50, height: '100vh', width: '100vw' }}
      >
        <div className='w-screen h-screen absolute top-0 items-center justify-center bg-bg-primary'>
          <div className='w-[200px] h-[200px]'>
            <img src={splashImg}></img>
          </div>
        </div>
      </FaderTransition>
      <FaderTransition
        shouldShow={intialLoadComplete && (!libraryLoading || ebooksMetadata.length > 0)}
        speed={400}
        style={{ height: '100%', width: '100%' }}
      >
        <div className='h-full overflow-y-auto scrollbar-hide'>
          <div className='w-full max-w-5xl self-center px-5 pt-4 padding-safe-area-bottom'>
            <header className='flex flex-row items-center justify-between'>
              <h1 className='font-display text-[2rem] font-semibold tracking-[-0.01em]'>Library</h1>
              <button
                type='button'
                aria-label='Add a book'
                className='pressable w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center'
                onClick={() => promptToAddBook()}
              >
                <FontAwesomeIcon className='text-lg' icon={faPlus} />
              </button>
            </header>

            {ebooksMetadata.length > 0 &&
              <div className='relative mt-4'>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className='absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-tertiary pointer-events-none'
                />
                <input
                  type='search'
                  enterKeyHint='search'
                  className='w-full h-11 rounded-xl bg-bg-secondary pl-10 pr-10 text-[0.95rem] placeholder:text-text-tertiary outline-none focus:shadow-[inset_0_0_0_1px_rgba(244,241,234,0.25)] [&::-webkit-search-cancel-button]:hidden'
                  placeholder='Title or author'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search &&
                  <button
                    type='button'
                    aria-label='Clear search'
                    className='pressable absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-text-secondary'
                    onClick={() => setSearch('')}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                }
              </div>
            }

            {!query && continueReading && <ContinueReading metadata={continueReading} />}

            {ebooksMetadata.length > 0 &&
              <section className='mt-8 pb-8'>
                <div className='flex flex-row items-center justify-between mb-4 gap-3'>
                  <div className='eyebrow text-text-secondary flex-row gap-2'>
                    <span>{query ? 'Results' : 'All books'}</span>
                    <span className='text-text-tertiary tabular-nums'>{results.length}</span>
                  </div>
                  <Segmented<Sort>
                    size='sm'
                    ariaLabel='Sort by'
                    value={sort}
                    onChange={changeSort}
                    options={[
                      { value: 'recent', name: 'Recent' },
                      { value: 'title', name: 'Title' },
                      { value: 'author', name: 'Author' },
                    ]}
                  />
                </div>
                {results.length > 0 ? (
                  <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-6'>
                    {results.map(metadata => <BookTile key={metadata.filePath} metadata={metadata} />)}
                  </div>
                ) : (
                  <div className='items-center text-center py-12 text-text-secondary'>
                    No books match “{search.trim()}”
                  </div>
                )}
              </section>
            }

            {!libraryLoading && ebooksMetadata.length === 0 &&
              <div className='items-center text-center pt-24 px-6 gap-2'>
                <div className='font-display text-xl font-semibold'>Your library is empty</div>
                <div className='text-text-secondary max-w-xs'>Add an EPUB from your files to start reading.</div>
                <button
                  type='button'
                  className='pressable mt-5 h-11 px-6 rounded-full bg-text-primary text-bg-primary font-semibold'
                  onClick={() => promptToAddBook()}
                >
                  Add a book
                </button>
              </div>
            }
          </div>
        </div>
      </FaderTransition>
    </div>
  )
}

export default Home
