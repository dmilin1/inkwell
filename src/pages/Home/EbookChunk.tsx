import { useContext } from 'react';
import tailwindConfig from '../../../tailwind.config.js';
import { EbookContext } from '../../contexts/EbookContext';
import { Metadata } from '../../models/Ebook.js';
import Library from '../../models/Library';

type EbookChunkProps = {
  sectionTitle: string;
  bookData: Metadata[];
}

function EbookChunk({ sectionTitle, bookData }: EbookChunkProps) {
  const { changeEbook } = useContext(EbookContext);

  const colors = tailwindConfig.theme.extend.colors;

  return (
    <div className='mt-5 mx-5 grow'>
      <div className='text-xl'>{sectionTitle}</div>
      <div className='margin-safe-area-bottom md:grid grid-cols-2 xl:grid-cols-3 gap-x-5'>
        {bookData?.map((metadata: Metadata) => 
          <div
            onClick={async () => {
              const books = await Library.getBooks();
              changeEbook(books[metadata?.filePath]);
            }}
            key={metadata.filePath}
            className='flex-row bg-bg-secondary min-h-[8rem] rounded-2xl mt-10 cursor-pointer'
          >
            <div className='min-w-[8rem] relative center items-center'>
              <div className='min-w-[5.6rem] min-h-[8rem] rounded-xl absolute bottom-5 bg-[size:100%_100%]' style={{
                backgroundImage: `url('${metadata.coverImgPath}')`
              }}/>
            </div>
            <div className='grow pt-2 pb-5'>
              <div className=''>{metadata.title}</div>
              <div className='grow text-text-secondary'>By {metadata.author}</div>
              <div className='text-text-secondary text-sm line-clamp-2'>{metadata.subjects?.join(', ')}</div>
            </div>
            <div className='justify-center'>
              <div
                className='progressbar w-10 h-10 rounded-full m-5'
                style={{
                  background: `
                    radial-gradient(closest-side, ${colors['bg-secondary']} 70%, transparent 0 99.9%, ${colors['bg-secondary']} 0),
                    conic-gradient(${colors.accent} calc(${100 *( metadata.progress?.percentComplete ?? 0)} * 1%), ${colors['bg-primary']} 0)
                  `
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EbookChunk