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

    fontColor: string,
    backgroundColor: string,
}

const defaultSettings: Settings = {
    fontFamily: 'Roboto',
    fontSize: 18,
    fontWeight: '400',

    readingMode: 'scrolling',
    lineSpacing: 1.25,
    wordSpacing: 1,
    letterSpacing: 1,
    paragraphSpacing: 10,
    paragraphIndentation: 1,
    verticalMargins: 0,
    horizontalMargins: 10,
    statusBar: StatusBarMode.Dark,

    fontColor: '#ffffff',
    backgroundColor: '#000000',
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
        const allSettings = {
            ...settings,
            ...newSettings,
        }
        setSettings(allSettings);
        Preferences.set({ key: 'settings', value: JSON.stringify(allSettings) });
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