import { useContext } from 'react';
import { SettingsContext } from '../../contexts/SettingsContext';
import { ChapterContext } from '../../contexts/ChapterContext';
import { StatusBarMode } from '../../utils/StatusBar';


/** Fades the page out under the status bar so the clock stays readable. */
export function StatusBarTint() {
    const { settings, isSettingsOpen } = useContext(SettingsContext);
    const { isChapterSelectOpen } = useContext(ChapterContext);

    // The menu and the contents draw their own opaque bar behind the status bar.
    if (settings.statusBar === StatusBarMode.Hidden || isSettingsOpen || isChapterSelectOpen) {
        return null;
    }

    const bg = settings.backgroundColor;
    return (
        <div
            className='absolute top-0 left-0 padding-safe-area-top w-full z-[100] pointer-events-none'
            style={{
                background: `linear-gradient(${bg}e6 70%, ${bg}00)`
            }}
        />
    );
}
