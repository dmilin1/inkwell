import './Roboto/Roboto.css';
import './OpenSans/OpenSans.css';
import '@fontsource-variable/literata/wght.css';
import '@fontsource-variable/literata/wght-italic.css';

/** Reading fonts offered in the settings. All are bundled or present on iOS and Android. */
export const READER_FONTS: { value: string, name: string }[] = [
    { value: 'Literata', name: 'Literata' },
    { value: 'Georgia', name: 'Georgia' },
    { value: 'Roboto', name: 'Roboto' },
    { value: 'OpenSans', name: 'Open Sans' },
    { value: 'System', name: 'System' },
    { value: 'Courier New', name: 'Courier' },
];

/**
 * CSS font-family for a font setting, with fallbacks. Fonts that only exist
 * on some platforms (including ones offered by older versions) fall back to a
 * font of the same style instead of the browser default.
 */
export function fontStack(font: string): string {
    switch (font) {
        case 'Literata': return '"Literata Variable", Georgia, serif';
        case 'Georgia': return 'Georgia, "Literata Variable", serif';
        case 'Times New Roman': return '"Times New Roman", Times, serif';
        case 'Roboto': return 'Roboto, sans-serif';
        case 'OpenSans': return 'OpenSans, sans-serif';
        case 'System': return '-apple-system, BlinkMacSystemFont, system-ui, sans-serif';
        case 'Courier New': return '"Courier New", Courier, monospace';
        default: return `"${font}", -apple-system, system-ui, sans-serif`;
    }
}
