import { StatusBarMode } from './StatusBar';

export type ReaderTheme = {
    name: string,
    fontColor: string,
    backgroundColor: string,
    /** Status bar text that stays readable on this background. */
    statusBar: StatusBarMode.Light | StatusBarMode.Dark,
};

/** Reading color presets. "Custom" is any other combination. */
export const READER_THEMES: ReaderTheme[] = [
    { name: 'Paper', fontColor: '#2b2824', backgroundColor: '#fbf8f2', statusBar: StatusBarMode.Light },
    { name: 'Sepia', fontColor: '#4b3a26', backgroundColor: '#f2e6cf', statusBar: StatusBarMode.Light },
    { name: 'Slate', fontColor: '#d9d7d1', backgroundColor: '#2c2f3a', statusBar: StatusBarMode.Dark },
    { name: 'Night', fontColor: '#d4d0c7', backgroundColor: '#15161c', statusBar: StatusBarMode.Dark },
    { name: 'Black', fontColor: '#b9b5ad', backgroundColor: '#000000', statusBar: StatusBarMode.Dark },
];

export function matchingTheme(fontColor: string, backgroundColor: string): ReaderTheme | undefined {
    return READER_THEMES.find(theme =>
        theme.fontColor.toLowerCase() === fontColor.toLowerCase()
        && theme.backgroundColor.toLowerCase() === backgroundColor.toLowerCase()
    );
}

/** Whether a #rrggbb color is light (used to keep the status bar readable). */
export function isLightColor(hex: string): boolean {
    const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i.exec(hex);
    if (!match) {
        return false;
    }
    const [r, g, b] = match.slice(1).map(c => parseInt(c, 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}
