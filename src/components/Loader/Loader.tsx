import { useContext } from 'react'
import './Loader.css'
import { SettingsContext } from '../../contexts/SettingsContext'

export function Loader() {
    const { settings } = useContext(SettingsContext);
    
    return (
        <div
            className='w-screen h-screen pointer-events-none absolute top-0 z-50 items-center justify-center'
            style={{
                backgroundColor: settings.backgroundColor
            }}
        >
            <div className="loader">
                <div className="inner one"></div>
                <div className="inner two"></div>
                <div className="inner three"></div>
            </div>
        </div>
    )
}