import { useEffect, useState } from 'react';
import Library from '../../models/Library.js'
import { faPlus, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Metadata } from '../../models/Ebook.js';
import { StatusBar, StatusBarMode } from '../../utils/StatusBar.js';
import { Files } from '../../utils/Files.js';
import EbookRow from './EbookRow.js';
import EbookChunk from './EbookChunk.js';


function Home() {
  const [ebooksMetadata, setEbooksMetadata] = useState<Metadata[]>();
  const [search, setSearch] = useState<string>('');

  StatusBar.set(StatusBarMode.Dark);

  const loadEbooks = async (reload = false) => {
    const ebooks = await Library.getBooks(reload);
    const metadata = await Promise.all(
        Object.values(ebooks).map(ebook => ebook.loadMetadata())
    );
    setEbooksMetadata(metadata);
  }

  useEffect(() => {
    loadEbooks();
  }, []);

  return (
    <div className='max-h-full margin-safe-area-top select-none'>
      { ebooksMetadata ? (
        <>
          <div className='m-5 md:flex-row'>
            <div className='text-3xl border-r-1 font-bold flex-row justify-between'>
              <div className='justify-center'>My Collection</div>
              <div
                className='bg-bg-secondary w-10 h-10 rounded-lg justify-center cursor-pointer md:hidden'
                onClick={async () => {
                  let file = await Files.promptForFile();
                  await Library.addToLibrary(file);
                  loadEbooks(true);
                }}
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
              onClick={async () => {
                let file = await Files.promptForFile();
                Library.addToLibrary(file);
                await Library.addToLibrary(file);
                loadEbooks(true);
              }}
            >
              <FontAwesomeIcon className='text-lg' icon={faCloudArrowUp} /><span>Add Book</span>
            </div>
          </div>
          <div className='overflow-scroll scrollbar-hide'>
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
        </>
      ) : null }
    </div>
  )
}

export default Home
