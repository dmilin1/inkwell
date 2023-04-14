
export class Files {

    static promptForFile(): Promise<File> {
        let input = document.createElement('input');
        input.type = 'file';
        input.accept = '.epub';
        return new Promise(res => {
            input.onchange = (e) => {
                let file = input.files?.[0]!;
                e.stopPropagation();
                res(file);
            };
            input.click();
        })
    }

    static async fileToBase64(file: File): Promise<string> {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise(res => reader.onload = res);
        const base64 = reader.result as string;
        return base64;
    }
}

