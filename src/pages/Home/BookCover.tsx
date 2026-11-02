import { useState } from 'react';
import { Metadata } from '../../models/Ebook';

/** Muted cloth-binding colors for books without a cover image. */
const BINDINGS = ['#5b3a35', '#36503f', '#36445e', '#6a5634', '#4b3b58', '#2f4f53', '#5a4a3c'];

function bindingFor(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = (hash * 31 + text.charCodeAt(i)) | 0;
    }
    return BINDINGS[Math.abs(hash) % BINDINGS.length];
}

interface BookCoverProps {
    metadata: Metadata,
    className?: string,
    /** Small covers get smaller stand-in type. */
    size?: 'sm' | 'md',
}

/** A book's cover at a 2:3 ratio, or a typeset stand-in when it has none. */
export function BookCover({ metadata, className = '', size = 'md' }: BookCoverProps) {
    // Covers that are far from book-shaped (e.g. scanned title pages) are shown
    // whole instead of being cropped.
    const [fit, setFit] = useState<'cover' | 'contain'>('cover');
    const frame = `relative aspect-[2/3] overflow-hidden rounded-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.4),0_8px_18px_-10px_rgba(0,0,0,0.7)] ${className}`;

    if (metadata.coverImgPath && !metadata.error) {
        return (
            <div className={`${frame} ${fit === 'contain' ? 'bg-[#f4f1ea]' : 'bg-bg-secondary'}`}>
                <img
                    src={metadata.coverImgPath}
                    alt=''
                    draggable={false}
                    className={`absolute inset-0 w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                    onLoad={e => {
                        const { naturalWidth, naturalHeight } = e.currentTarget;
                        const ratio = naturalWidth / naturalHeight;
                        setFit(Math.abs(ratio / (2 / 3) - 1) > 0.3 ? 'contain' : 'cover');
                    }}
                />
                {/* Defines the edge of pale covers against the background. */}
                <div className='absolute inset-0 rounded-[3px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]' />
            </div>
        );
    }

    const title = metadata.title ?? 'Untitled';
    return (
        <div
            className={frame}
            style={{ backgroundColor: metadata.error ? '#3a3a44' : bindingFor(title) }}
        >
            <div className='absolute inset-[6%] border border-white/20 rounded-[2px] p-[8%] justify-between overflow-hidden'>
                <div className={`font-display font-semibold leading-tight text-[#f4efe3] line-clamp-5 break-words ${
                    size === 'sm' ? 'text-[0.6rem]' : 'text-[0.8rem]'
                }`}>
                    {title}
                </div>
                <div className={`text-[#f4efe3]/70 leading-tight line-clamp-2 ${size === 'sm' ? 'text-[0.5rem]' : 'text-[0.65rem]'}`}>
                    {metadata.error ? "Can't open" : metadata.author}
                </div>
            </div>
        </div>
    );
}
