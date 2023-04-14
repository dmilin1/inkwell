import { Capacitor } from '@capacitor/core';
import { StatusBar as SBar, Style} from '@capacitor/status-bar';

export enum StatusBarMode {
    Light = 'Light',
    Dark = 'Dark',
    Hidden = 'Hidden',
}

export class StatusBar {

    static set(mode: StatusBarMode) {
        if (!Capacitor.isNativePlatform()) {
            return;
        }
        switch (mode) {
            case StatusBarMode.Hidden:
                SBar.hide();
                break;
            case StatusBarMode.Dark:
                SBar.show();
                SBar.setStyle({ style: Style.Dark });
                break;
            case StatusBarMode.Light:
                SBar.show();
                SBar.setStyle({ style: Style.Light });
                break;
            default:
                throw Error('unknown status bar mode:', mode);
        }
    }
}

