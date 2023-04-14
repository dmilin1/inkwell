import Epub from "./Epub";
import { Ebook } from "./Ebook";


export class EbookLoader {

    static new(filePath: string, base64?: string): Ebook {
        if (filePath.endsWith('.epub')) {
            return new Epub(filePath, base64);
        } else {
            throw 'Unsupported File Type';
        }
    }
}
