import { useContext, useEffect, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { faPlus, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { StatusBar, StatusBarMode } from '../../utils/StatusBar.js';
import EbookRow from './EbookRow.js';
import EbookChunk from './EbookChunk.js';
import { LibraryContext } from '../../contexts/LibraryContext.js';
import splashImg from '../../resources/images/splash-icon.png';
import { FaderTransition } from '../../components/FaderTransition/FaderTransition.js';

let componentHasLoadedBefore = false;

function Home() {
  const { libraryLoading, ebooksMetadata, promptToAddBook } = useContext(LibraryContext);
  
  const [intialLoadComplete, setInitialLoadComplete] = useState(componentHasLoadedBefore);
  const [search, setSearch] = useState<string>('');

  StatusBar.set(StatusBarMode.Dark);

  useEffect(() => {
    if (!libraryLoading) {
      componentHasLoadedBefore = true;
      SplashScreen.hide({ fadeOutDuration: 200 });
      setTimeout(() => setInitialLoadComplete(true), 200);
    }
  }, [libraryLoading]);

  return (
    <div className='max-h-full margin-safe-area-top select-none'>
      <FaderTransition
        shouldShow={!intialLoadComplete}
        style={{ height: '100vh', width: '100vw' }}
      >
        <div className='w-screen h-screen absolute top-0 items-center justify-center'>
          <div className='w-[200px] h-[200px]'>
            <img src={splashImg}></img>
          </div>
        </div>
      </FaderTransition>
      <FaderTransition
        shouldShow={intialLoadComplete && !libraryLoading}
        speed={1000}
        style={{ height: '100%', width: '100%' }}
      >
        <div className='m-5 md:flex-row'>
          <div className='text-3xl border-r-1 font-bold flex-row justify-between'>
            <div className='justify-center'>My Collection</div>
            <div
              className='bg-bg-secondary w-10 h-10 rounded-lg justify-center cursor-pointer md:hidden'
              onClick={() => promptToAddBook()}
            >
              <FontAwesomeIcon className='text-2xl' icon={faPlus} />
            </div>
          </div>
          <input
            className='mt-5 md:mt-0 md:mx-5 bg-bg-secondary p-3 rounded-2xl min-w-[300px]'
            placeholder='Search by title or author.'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            className='bg-bg-secondary space-x-3 flex-row p-3 rounded-lg ml-auto justify-center items-center cursor-pointer hidden md:flex'
            onClick={() => promptToAddBook()}
          >
            <FontAwesomeIcon className='text-lg' icon={faCloudArrowUp} /><span>Add Book</span>
          </div>
        </div>
        <div className='overflow-scroll scrollbar-hide pb-5'>
          {search ? (
            <EbookChunk
              sectionTitle='Results'
              bookData={
                [...ebooksMetadata]
                .filter(metadata =>{
                  const str = search.toLowerCase();
                  return metadata.title?.toLowerCase().includes(str)
                    || metadata.author?.toLowerCase().includes(str);
                }).sort((a, b) =>
                  (a.title ?? 'z') > (b.title ?? 'z') ? 1 : -1
                )
              }
            />
          ) : (
            <>
              <EbookRow
                sectionTitle='Recently Opened'
                bookData={[...ebooksMetadata].sort((a, b) =>
                  Math.sign(b.stats.lastOpenedAt - a.stats.lastOpenedAt)
                ).slice(0, 10)}
              />
              <EbookRow
                sectionTitle='Recently Added'
                bookData={[...ebooksMetadata].sort((a, b) =>
                  Math.sign(b.stats.addedAt - a.stats.addedAt)
                ).slice(0, 10)}
              />
              <EbookChunk
                sectionTitle='All Books'
                bookData={[...ebooksMetadata].sort((a, b) =>
                  (a.title ?? 'z') > (b.title ?? 'z') ? 1 : -1
                )}
              />
            </>
          )}
        </div>
      </FaderTransition>
    </div>
  )
}

export default Home
