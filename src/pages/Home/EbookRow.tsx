import { useContext } from 'react';
import { EbookContext } from '../../contexts/EbookContext';
import { Metadata } from '../../models/Ebook.js';
import Library from '../../models/Library';

interface EbookRowProps {
  sectionTitle: string;
  bookData: Metadata[];
}

function EbookRow({ sectionTitle, bookData }: EbookRowProps) {
  const { changeEbook } = useContext(EbookContext);

  return (
    <div className='mt-5'>
      <div className='mx-5 text-xl'>{sectionTitle}</div>
      <div className='flex-row items-center overflow-x-scroll space-x-8 p-5 scrollbar-hide'>
        {bookData?.map((metadata: Metadata) => 
          <div
            onClick={async () => {
              const books = await Library.getBooks();
              changeEbook(books[metadata?.filePath]);
            }}
            key={metadata.filePath}
            className='min-w-[7rem] max-w-[7rem] min-h-[10rem] bg-bg-secondary rounded-xl bg-[size:100%_100%] cursor-pointer justify-center text-center'
            style={{
              backgroundImage: `url('${metadata.coverImgPath}')`
            }}
          >
            {metadata.coverImgPath ? '' : [metadata.title, metadata.author].join(' - ')}
          </div>
        )}
      </div>
    </div>
  )
}

export default EbookRow
