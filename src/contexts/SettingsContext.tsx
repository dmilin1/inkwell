import { Dispatch, SetStateAction, createContext, useEffect, useState } from 'react';
import { Preferences } from '@capacitor/preferences';
import { StatusBarMode } from '../utils/StatusBar';


export type Settings = {
    fontFamily: string,
    fontSize: number,
    fontWeight: string,

    readingMode: 'scrolling'|'paginated',
    lineSpacing: number,
    wordSpacing: number,
    letterSpacing: number,
    paragraphSpacing: number,
    paragraphIndentation: number,
    verticalMargins: number,
    horizontalMargins: number,
    /** Maximum line length; side margins still apply as the minimum gap from the screen edge. */
    lineLength: 'narrow'|'medium'|'wide'|'full',
    statusBar: StatusBarMode,
    /** 'visible': always shown; 'untouchable': shown while scrolling (name kept from older versions). */
    scrollBar: 'visible'|'untouchable'|'hidden',
    /** Whether the always-shown scroll bar can be dragged. Off keeps it from catching the thumb while reading. */
    scrollBarDraggable: boolean,

    fontColor: string,
    backgroundColor: string,
    /** Dark themes: invert light line-art images (ornaments, scans) so they don't glare. */
    invertImages: boolean,
}

/** Defaults for people who haven't changed anything (saved settings are kept as they are). */
const defaultSettings: Settings = {
    fontFamily: 'Literata',
    fontSize: 18,
    fontWeight: '400',

    readingMode: 'scrolling',
    lineSpacing: 1.5,
    wordSpacing: 1,
    letterSpacing: 1,
    paragraphSpacing: 8,
    paragraphIndentation: 1.5,
    verticalMargins: 8,
    horizontalMargins: 24,
    lineLength: 'medium',
    statusBar: StatusBarMode.Dark,
    scrollBar: 'untouchable',
    scrollBarDraggable: false,

    fontColor: '#d4d0c7',
    backgroundColor: '#15161c',
    invertImages: true,
}


type SettingsContext = {
    settings: Settings,
    changeSettings: (newSettings: Partial<Settings>) => void,
    isSettingsOpen: boolean,
    setIsSettingsOpen: Dispatch<SetStateAction<boolean>>,
};

export const SettingsContext = createContext<SettingsContext>({
    settings: defaultSettings,
    changeSettings: () => {},
    isSettingsOpen: false,
    setIsSettingsOpen: () => {},
});

export function SettingsProvider({ children }: React.PropsWithChildren) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState(defaultSettings);

    const changeSettings = (newSettings: Partial<Settings>) => {
        // Based on the latest state, so quick successive changes don't drop each other.
        setSettings(previous => {
            const allSettings = {
                ...previous,
                ...newSettings,
            };
            Preferences.set({ key: 'settings', value: JSON.stringify(allSettings) });
            return allSettings;
        });
    }

    const loadSavedSettings = async () => {
        const settingsStr = (await Preferences.get({ key: 'settings' })).value;
        if (settingsStr) {
            const savedSettings = JSON.parse(settingsStr);
            changeSettings(savedSettings);
        }
    }

    useEffect(() => {
        loadSavedSettings();
    }, []);
    
    return (
        <SettingsContext.Provider value={{
            settings,
            changeSettings,
            isSettingsOpen,
            setIsSettingsOpen,
        }}>
            {children}
        </SettingsContext.Provider>
    );
}