import { useContext, useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons"
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { SettingsContext } from "../../contexts/SettingsContext";

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

/** How far (after damping) the page must be pulled to change chapter. */
const DRAG_ACTION_LIMIT = 100;

interface PullIndicatorProps {
    edge: 'top' | 'bottom',
    progress: number,
    label: string,
}

/**
 * Shown while the page is pulled past its edge: a ring that fills up to the
 * point where letting go changes chapter. Pinned to the screen edge so it's
 * visible however far the page has stretched.
 */
function PullIndicator({ edge, progress, label }: PullIndicatorProps) {
    const { settings } = useContext(SettingsContext);
    const radius = 9;
    const circumference = 2 * Math.PI * radius;
    const ready = progress >= 1;
    return (
        <div
            className='fixed left-1/2 z-[25] flex flex-row items-center gap-2.5 h-10 pl-2 pr-4 rounded-full font-sans text-sm whitespace-nowrap pointer-events-none transition-transform duration-150'
            style={{
                [edge]: edge === 'top' ? 'calc(var(--sat) + 0.75rem)' : 'calc(var(--sab) + 1rem)',
                transform: `translateX(-50%) scale(${ready ? 1.04 : 1})`,
                backgroundColor: settings.backgroundColor,
                color: settings.fontColor,
                boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
            }}
            role='status'
        >
            {/* Outline in the text color (color-mix() would need iOS 16.2). */}
            <span className='absolute inset-0 rounded-full opacity-25' style={{ boxShadow: 'inset 0 0 0 1px currentColor' }} />
            <span className='relative w-6 h-6 flex items-center justify-center'>
                <svg className='absolute inset-0 -rotate-90' viewBox='0 0 24 24' aria-hidden='true'>
                    <circle cx='12' cy='12' r={radius} fill='none' stroke='currentColor' strokeOpacity='0.2' strokeWidth='2' />
                    <circle
                        cx='12' cy='12' r={radius} fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - Math.min(1, progress))}
                    />
                </svg>
                <FontAwesomeIcon icon={edge === 'top' ? faArrowDown : faArrowUp} className='text-[0.6rem]' />
            </span>
            <span>{label}</span>
        </div>
    );
}

export function ScrollPull({ children, pulledUp, pulledDown, atBeginning, atEnd }: React.PropsWithChildren<ScrollPullProps>) {
    const scrollContainer = useRef<HTMLInputElement>(null);
    const topSection = useRef<HTMLInputElement>(null);
    const bottomSection = useRef<HTMLInputElement>(null);
    const [topDragStartPos, setTopDragStartPos] = useState<Coordinate|null>(null)
    const [bottomDragStartPos, setBottomDragStartPos] = useState<Coordinate|null>(null)
    const [topMargin, setTopMargin] = useState(0);
    const [bottomMargin, setBottomMargin] = useState(0);

    // A light tap when the pull crosses the point of no return (either way).
    const thresholdReached = useRef(false);
    const pull = (margin: number) => {
        const reached = margin > DRAG_ACTION_LIMIT;
        if (reached !== thresholdReached.current) {
            thresholdReached.current = reached;
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
        }
        return margin;
    };

    const topProgress = topMargin / DRAG_ACTION_LIMIT;
    const bottomProgress = bottomMargin / DRAG_ACTION_LIMIT;

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
                if (topMargin > DRAG_ACTION_LIMIT) {
                    pulledUp?.();
                }
                if (bottomMargin > DRAG_ACTION_LIMIT) {
                    pulledDown?.();
                }
                thresholdReached.current = false;
                setTopDragStartPos(null);
                setTopMargin(0);
                setBottomDragStartPos(null);
                setBottomMargin(0);
            }}
            onTouchMove={e => {
                const y = e.targetTouches.item(0).clientY;
                if (topDragStartPos && topSection.current && !atBeginning) {
                    const delta = y - (topDragStartPos?.y ?? 0);
                    if (delta > 0) {
                        setTopMargin(pull(delta / 2));
                    } else {
                        setTopDragStartPos(null);
                    }
                }
                if (bottomDragStartPos && bottomSection.current && !atEnd) {
                    const delta = (bottomDragStartPos?.y ?? 0) - y;
                    if (delta > 0) {
                        setBottomMargin(pull(delta / 2));
                    } else {
                        setBottomDragStartPos(null);
                    }
                }
            }}
        >
            {/* Space above the chapter that's revealed while pulling down. */}
            <div
                id='top-section'
                ref={topSection}
                className='h-12'
                style={{
                    marginTop: `calc(-3rem + ${topMargin}px - var(--sat))`,
                    marginBottom: `var(--sat)`,
                    transition: !topMargin ? 'margin-top 0.25s ease-out' : undefined,
                }}
            />
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
                ) : (
                    <button
                        type='button'
                        className='pressable flex flex-row items-center gap-2 h-10 px-5 rounded-full opacity-70'
                        // The pull indicator takes over while pulling.
                        style={{ boxShadow: 'inset 0 0 0 1px currentColor', visibility: bottomMargin > 4 ? 'hidden' : undefined }}
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
            {topMargin > 4 &&
                <PullIndicator
                    edge='top'
                    progress={topProgress}
                    label={topProgress >= 1 ? 'Release for previous chapter' : 'Keep pulling for previous chapter'}
                />
            }
            {bottomMargin > 4 &&
                <PullIndicator
                    edge='bottom'
                    progress={bottomProgress}
                    label={bottomProgress >= 1 ? 'Release for next chapter' : 'Keep pulling for next chapter'}
                />
            }
        </div>
    )
}
