import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons"

interface Coordinate {
    x: number,
    y: number,
}

interface ScrollPullProps {
    pulledUp?: () => void;
    pulledDown?: () => void;
    atBeginning?: boolean;
    atEnd?: boolean;
}

export function ScrollPull({ children, pulledUp, pulledDown, atBeginning, atEnd }: React.PropsWithChildren<ScrollPullProps>) {
    const scrollContainer = useRef<HTMLInputElement>(null);
    const topSection = useRef<HTMLInputElement>(null);
    const bottomSection = useRef<HTMLInputElement>(null);
    const [topDragStartPos, setTopDragStartPos] = useState<Coordinate|null>(null)
    const [bottomDragStartPos, setBottomDragStartPos] = useState<Coordinate|null>(null)
    const [topMargin, setTopMargin] = useState(0);
    const [bottomMargin, setBottomMargin] = useState(0);

    const dragActionLimit = 100;

    return (
        <div
            ref={scrollContainer}
            onTouchStart={e => {
                const x = e.targetTouches.item(0).clientX;
                const y = e.targetTouches.item(0).clientY;
                const scrollContainerTop = scrollContainer.current?.getBoundingClientRect().top ?? 0;
                const parentTop = scrollContainer.current?.parentElement?.getBoundingClientRect().top ?? 0;
                const parentTopPadding = Number(window.getComputedStyle(scrollContainer.current?.parentElement as Element).paddingTop.replace('px', ''));
                if (Math.round(scrollContainerTop - parentTopPadding) === Math.round(parentTop)) {
                    setTopDragStartPos({ x, y });
                }
                const scrollContainerBottom = scrollContainer.current?.getBoundingClientRect().bottom ?? 0;
                const parentBottom = scrollContainer.current?.parentElement?.getBoundingClientRect().bottom ?? 0;
                const parentBottomPadding = Number(window.getComputedStyle(scrollContainer.current?.parentElement as Element).paddingBottom.replace('px', ''));
                if (Math.round(scrollContainerBottom - parentBottomPadding) === Math.round(parentBottom)) {
                    setBottomDragStartPos({ x, y });
                }
            }}
            onTouchEnd={() => {
                if (topMargin > dragActionLimit) {
                    pulledUp?.();
                }
                if (bottomMargin > dragActionLimit) {
                    pulledDown?.();
                }
                setTopDragStartPos(null);
                setTopMargin(0);
                setBottomDragStartPos(null);
                setBottomMargin(0);
            }}
            onTouchMove={e => {
                const y = e.targetTouches.item(0).clientY;
                if (topDragStartPos && topSection.current) {
                    const delta = y - (topDragStartPos?.y ?? 0);
                    if (delta > 0) {
                        setTopMargin(delta / 2);
                    } else {
                        setTopDragStartPos(null);
                    }
                }
                if (bottomDragStartPos && bottomSection.current) {
                    const delta = (bottomDragStartPos?.y ?? 0) - y;
                    if (delta > 0) {
                        setBottomMargin(delta / 2);
                    } else {
                        setBottomDragStartPos(null);
                    }
                }
            }}
        >
            <div
                id='top-section'
                ref={topSection}
                className='flex flex-row z-20 items-center justify-center gap-2 h-12 font-sans text-sm opacity-60'
                style={{
                    marginTop: `calc(-3rem + ${topMargin}px - var(--sat))`,
                    marginBottom: `var(--sat)`,
                    transition: !topMargin ? 'margin-top 0.25s ease-out' : undefined,
                }}
            >
                { !atBeginning && 
                    <>
                        <FontAwesomeIcon icon={faArrowDown} className='text-xs' />
                        <span>{topMargin < dragActionLimit ? 'Pull down for previous chapter' : 'Release for previous chapter'}</span>
                    </>
                }
            </div>
            {children}
            <div
                id='bottom-section'
                ref={bottomSection}
                className='flex flex-row z-20 items-center justify-center h-16 font-sans text-sm'
                style={{
                    marginTop: `calc(${bottomMargin}px)`,
                    transition: !bottomMargin ? 'margin-top 0.25s ease-out' : undefined,
                }}
            >
                { atEnd ? (
                    <span className='opacity-50'>End of book</span>
                ) : bottomMargin >= dragActionLimit ? (
                    <span className='opacity-60'>Release for next chapter</span>
                ) : (
                    <button
                        type='button'
                        className='pressable flex flex-row items-center gap-2 h-10 px-5 rounded-full opacity-70'
                        style={{ boxShadow: 'inset 0 0 0 1px currentColor' }}
                        onClick={e => {
                            e.stopPropagation();
                            pulledDown?.();
                        }}
                    >
                        Next chapter
                        <FontAwesomeIcon icon={faArrowUp} className='text-xs rotate-90' />
                    </button>
                )}
            </div>
        </div>
    )
}