import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp, faSpinner } from "@fortawesome/free-solid-svg-icons"

interface Coordinate {
    x: number,
    y: number,
}

interface ScrollPullProps {
    pulledUp?: () => void;
    pulledDown?: () => void;
}

export function ScrollPull({ children, pulledUp, pulledDown }: React.PropsWithChildren<ScrollPullProps>) {
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
                if (Math.round((topSection.current?.getBoundingClientRect().bottom ?? 0)) === 0) {
                    setTopDragStartPos({ x, y });
                }
                if (
                    Math.round((bottomSection.current?.getBoundingClientRect().bottom ?? 0))
                    === Math.round(window.innerHeight)
                ) {
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
                className='block z-20 text-center h-12 justify-center'
                style={{
                    marginTop: `calc(-3rem + ${topMargin}px - env(safe-area-inset-top))`,
                    marginBottom: `env(safe-area-inset-top)`,
                    transition: !topMargin ? 'margin-top 0.25s ease-out' : undefined,
                }}
            >
                <FontAwesomeIcon
                    icon={topMargin < dragActionLimit ? faArrowDown : faSpinner}
                    className={topMargin < dragActionLimit ? 'animate-bounce' : 'animate-spin'}
                />
                <span className='px-4'>Previous Chapter</span>
                <FontAwesomeIcon
                    icon={topMargin < dragActionLimit ? faArrowDown : faSpinner}
                    className={topMargin < dragActionLimit ? 'animate-bounce' : 'animate-spin'}
                />
            </div>
            {children}
            <div
                id='bottom-section'
                ref={bottomSection}
                className='block z-20 text-center h-12 justify-center'
                style={{
                    marginTop: `calc(${bottomMargin}px)`,
                    transition: !bottomMargin ? 'margin-top 0.25s ease-out' : undefined,
                }}
            >
                <FontAwesomeIcon
                    icon={bottomMargin < dragActionLimit ? faArrowUp : faSpinner}
                    className={bottomMargin < dragActionLimit ? 'animate-bounce' : 'animate-spin'}
                />
                <span className='px-4'>Next Chapter</span>
                <FontAwesomeIcon
                    icon={bottomMargin < dragActionLimit ? faArrowUp : faSpinner}
                    className={bottomMargin < dragActionLimit ? 'animate-bounce' : 'animate-spin'}
                />
            </div>
        </div>
    )
}