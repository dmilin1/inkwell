
interface FaderTransitionProps {
    shouldShow: boolean,
    speed?: number,
    style?: React.CSSProperties,
}

export function FaderTransition({ children, style, shouldShow, speed }: React.PropsWithChildren<FaderTransitionProps>) {

    return (
        <div className='h-fit w-fit' style={{
            transitionDuration: `${speed ?? 150}ms`,
            opacity: shouldShow ? 1 : 0,
            visibility: shouldShow ? 'visible' : 'hidden',
            ...style,
        }}>
            {children}
        </div>
    )
}