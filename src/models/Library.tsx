import { Ebook } from './Ebook';
import { EbookLoader } from "./EbookLoader";
import includedBooks from '../resources/ebooks/ebooks';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';

export type Ebooks = {
    [id: string]: Ebook;
}

export default class Library {

    private static readonly PATH = '/ebooks/';
    
    private static books: Ebooks = {};
    private static hasLoaded: Boolean = false;

    static async getBooks(reload: Boolean = false) {
        if (Library.hasLoaded && !reload) {
            return Library.books;
        }
        const addedBooks = (await Library.getBookFiles())
            .map(file => EbookLoader.new(file.fileName, file.base64));
        let inclBooks = includedBooks
            .map(file => EbookLoader.new(file));
        const deleted = (await Promise.all(inclBooks.map(async (book) => book.getStats())))
            .map(stats => stats.deleted);
        inclBooks = inclBooks.filter((_, i) => !deleted[i]);
        const books = [...addedBooks, ...inclBooks];
        Library.books = books.reduce((obj, book) => ({
            ...obj,
            [book.filePath]: book,
        }), {})
        Library.hasLoaded = true;
        return Library.books;
    }

    static async addToLibrary(file: File) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        await new Promise(res => reader.onload = res);
        const base64 = reader.result as string;
        await Filesystem.writeFile({
            path: `${Library.PATH}${file.name}`,
            data: base64,
            directory: Directory.Library,
            recursive: true,
        });
    }

    static async promptToDeleteBook(filePath: string): Promise<boolean> {
        const result = await ActionSheet.showActions({
            options: [{
                title: 'Delete From Libary',
            }, {
                title: 'Cancel',
                style: ActionSheetButtonStyle.Cancel,
            }],
        });
        if (result.index === 0) {
            const book = Library.books[filePath];
            if (book.builtIn) {
                await book.setStats({ deleted: true });
            } else {
                await Filesystem.deleteFile({
                    path: `${Library.PATH}${filePath}`,
                    directory: Directory.Library,
                });
            }
            return true;
        }
        return false;
    }

    private static async getBookFiles() {
        try {
            const dir = await Filesystem.readdir({
                path: Library.PATH,
                directory: Directory.Library,
            })
            const fileNames = dir.files.map(file => file.name);
            const files = await Promise.all(fileNames.map(async (fileName) => {
                const base64 = (await Filesystem.readFile({
                    path: `${Library.PATH}${fileName}`,
                    directory: Directory.Library,
                })).data;
                return {
                    fileName,
                    base64,
                }
            }));
            return files;
        } catch (e) {
            let message
            if (e instanceof Error) message = e.message
            if (
                message === 'Folder does not exist.'
                || message?.includes(`there is no such file`)
            ) {
                return [];
            }
            throw e;
        }
    }
}