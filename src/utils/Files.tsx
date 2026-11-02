
export class Files {

    /** Resolves to the chosen file, or undefined if the picker was cancelled. */
    static promptForFile(): Promise<File | undefined> {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.epub';
        return new Promise(res => {
            input.addEventListener('change', () => res(input.files?.[0]), { once: true });
            input.addEventListener('cancel', () => res(undefined), { once: true });
            input.click();
        })
    }
}
