import Epub from "./Epub";
import { Ebook } from "./Ebook";


export class EbookLoader {

    static isSupported(filePath: string): boolean {
        return /\.epub$/i.test(filePath);
    }

    static new(filePath: string, readFileData?: () => Promise<string | Blob>): Ebook {
        if (EbookLoader.isSupported(filePath)) {
            return new Epub(filePath, readFileData);
        }
        throw new Error('Unsupported file type');
    }
}
