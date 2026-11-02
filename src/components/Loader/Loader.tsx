import { useContext } from 'react'
import './Loader.css'
import { SettingsContext } from '../../contexts/SettingsContext'

/** Shown over the reader while a chapter loads; uses the reading theme's colors. */
export function Loader() {
    const { settings } = useContext(SettingsContext);

    return (
        <div
            className='w-screen h-screen pointer-events-none absolute top-0 left-0 z-50 items-center justify-center'
            style={{
                backgroundColor: settings.backgroundColor,
                color: settings.fontColor,
            }}
            role='progressbar'
            aria-label='Loading'
        >
            <div className="loader" />
        </div>
    )
}
