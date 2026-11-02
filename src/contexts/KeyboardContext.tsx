import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

type KeyboardContext = {
    keyboardHeight: number,
};

export const KeyboardContext = createContext<KeyboardContext>({
    keyboardHeight: 0,
});

export function KeyboardProvider({ children }: React.ComponentProps<any>) {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) {
            return;
        }
        // Register once (this previously ran after every render, piling up listeners).
        const listeners = [
            Keyboard.addListener('keyboardWillShow', info => {
                setKeyboardHeight(info.keyboardHeight);
            }),
            Keyboard.addListener('keyboardWillHide', () => {
                setKeyboardHeight(0);
            }),
        ];
        return () => {
            listeners.forEach(async listener => (await listener).remove());
        };
    }, [])
    
    return (
        <KeyboardContext.Provider value={{
            keyboardHeight
        }}>
            {children}
        </KeyboardContext.Provider>
    );
}

export function KeyboardWrapper({ children, className }: React.ComponentProps<any>) {
    const { keyboardHeight } = useContext(KeyboardContext);
    
    return (
        <div className={className} style={{
            marginBottom: keyboardHeight,
            transition: 'margin-bottom 300ms cubic-bezier(.12,.66,.25,.95)',
        }}>
            {children}
        </div>
    );
}