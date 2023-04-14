import { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { StatusBarMode } from '../../utils/StatusBar';


export function StatusBarTint() {
    const { settings, isSettingsOpen } = useContext(SettingsContext);

    const gradientHardness = isSettingsOpen ? '100%': '80%';
    const bg = settings.backgroundColor;

    return settings.statusBar !== StatusBarMode.Hidden ? (
        <div
            className='absolute top-0 padding-safe-area-top w-full z-[100]'
            style={{
                background: `linear-gradient(${bg}a0 ${gradientHardness}, ${bg}00)`
            }}
        />
    ) : null;
}
