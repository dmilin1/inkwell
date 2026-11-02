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
    statusBar: StatusBarMode,
    scrollBar: 'visible'|'untouchable'|'hidden',

    fontColor: string,
    backgroundColor: string,
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
    statusBar: StatusBarMode.Dark,
    scrollBar: 'untouchable',

    fontColor: '#d4d0c7',
    backgroundColor: '#15161c',
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