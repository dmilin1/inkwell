import { useState, useEffect } from "react";

interface ClickAndHoldProps {
    onClick?: () => void,
    onClickAndHold?: () => void,
    delay?: number,
    style?: React.CSSProperties,
}

export function ClickAndHold({ children, style, onClick, onClickAndHold, delay = 350 }: React.PropsWithChildren<ClickAndHoldProps>) {
    const [isHolding, setIsHolding] = useState(false);
    const [timeDownAt, setTimeDownAt] = useState(0);

    useEffect(() => {
        if (isHolding) {
            const timeoutId = setTimeout(() => {
                onClickAndHold?.();
                setIsHolding(false);
                setTimeDownAt(0);
            }, delay);

            return () => clearTimeout(timeoutId);
        }
    }, [isHolding]);

    return (
        <div
            style={{
                opacity: isHolding ? 0.5 : 1,
                ...style,
            }}
            onPointerDown={() => {
                setIsHolding(true);
                setTimeDownAt(Date.now());
            }}
            onPointerUp={(e) => {
                if (!isHolding) return;
                if (Date.now() - timeDownAt > delay) {
                    onClickAndHold?.();
                } else {
                    onClick?.();
                }
                setIsHolding(false);
                setTimeDownAt(0);
            }}
            onPointerLeave={() => {
                setIsHolding(false);
                setTimeDownAt(0);
            }}
        >
            {children}
        </div>
    )
}