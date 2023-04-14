import { useRef } from "react";

export function usePrevious<T>(value: T) {
    const oldVal = useRef<T>();
    const curVal = useRef<T>();
    const newVal = value;

    if (newVal !== curVal.current) {
        oldVal.current = curVal.current;
    }
    curVal.current = newVal;

    return oldVal.current;
}