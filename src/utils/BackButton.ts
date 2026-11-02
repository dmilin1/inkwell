import { useEffect, useRef } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Android hardware/gesture Back. The most recently activated handler wins
 * (e.g. chapter list, then settings menu, then the open book); with none
 * active, Back leaves the app as usual.
 */
const handlers: { run: () => void }[] = [];
let listening = false;

function listen() {
    if (listening || Capacitor.getPlatform() !== 'android') {
        return;
    }
    listening = true;
    App.addListener('backButton', () => {
        const handler = handlers[handlers.length - 1];
        if (handler) {
            handler.run();
        } else {
            App.exitApp();
        }
    });
}

/** While `active`, Back calls `onBack` instead of leaving the app. */
export function useBackHandler(active: boolean, onBack: () => void) {
    const latest = useRef(onBack);
    latest.current = onBack;

    useEffect(() => {
        if (!active) {
            return;
        }
        listen();
        const handler = { run: () => latest.current() };
        handlers.push(handler);
        return () => {
            const i = handlers.indexOf(handler);
            if (i >= 0) {
                handlers.splice(i, 1);
            }
        };
    }, [active]);
}
