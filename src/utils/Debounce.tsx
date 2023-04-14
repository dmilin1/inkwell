import { useRef } from "react";

const debounceRequests: {[key: string]: NodeJS.Timeout} = {}
const debounceFunctions: {[key: string]: Function} = {}


export function debounce(key: string, ms: number, func: Function) {
    if (debounceRequests[key]) {
        clearTimeout(debounceRequests[key]);
    }
    debounceFunctions[key] = func;
    debounceRequests[key] = setTimeout(async () => {
        debounceFunctions[key]();
        delete debounceRequests[key];
    }, ms);
}


export function useDebounce<T extends any[]>(key: string, ms: number, func: Function) {
    const ref = useRef<(...args: T) => void>();
    ref.current = (...args: T) => debounce(key, ms, () => func(...args));
    return ref;
}