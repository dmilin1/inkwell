import $ from "jquery";
import JSZip from 'jszip';
import { xml2js, Element } from 'xml-js';
import { Chapter, Chapters, Ebook, HTMLOptions } from './Ebook';

interface Manifest {
    [id: string]: string;
}

export default class Epub extends Ebook {

    zip?: JSZip;
    rootFileFolderPath?: string;
    private rootFile?: EzXML;
    private manifest?: Manifest;
    manifestBlobs?: Manifest;
    chapters?: Chapters;

    async loadMetadata() {
        await this.openFile();
        const metadataObj = this.rootFile!.package.metadata
        const metadata = {
            filePath: this.filePath,
            title: metadataObj?.elems('dc:title')?.[0].innerText,
            author: metadataObj?.elems('dc:creator')
                ?.map((elem: EzXML) => elem.innerText)
                .join(' & '),
            language: metadataObj?.elems('dc:language')
                ?.map((elem: EzXML) => elem.innerText)
                .join(', '),
            date: metadataObj?.elems('dc:language')?.[0]?.innerText,
            description: metadataObj?.elems('dc:description')?.[0]?.innerText,
            subjects: metadataObj.items()
                .filter((e: EzXML) => e.name === 'dc:subject')
                .map((e: EzXML) => e.innerText),
            coverImgPath: await this.loadCoverImg(),
            stats: await this.getStats(),
            progress: await this.loadSpot(),
        }
        return metadata;
    }

    async loadChapters(): Promise<Chapters> {
        await this.openFile();
        const tocId = this.rootFile!.package.spine.attribute('toc');
        const tocFilePath = this.manifest?.[tocId];
        const tocFile = await this.readXML(this.rootFileFolderPath! + tocFilePath);
        const flattenedNavMap = this.flattenNavMap(tocFile.ncx.navMap);
        const orderedChapters = flattenedNavMap.map((chapter: EzXML, i: number) => 
            new EpubChapter(
                this,
                chapter.navLabel.text.innerText,
                chapter.content.attribute('src'),
                i,
            )
        );
        this.chapters = new EpubChapters(orderedChapters);
        return this.chapters;
    }

    private async openFile(): Promise<void> {
        if (this.base64) {
            this.zip = await JSZip.loadAsync(this.base64, { base64: true });
        } else {
            this.zip = await fetch(this.filePath)
            .then(res => res.blob())
            .then(JSZip.loadAsync);
        }
        const containerFile = await this.readXML('META-INF/container.xml');
        const rootFilePath = containerFile
            .container.rootfiles.rootfile
            .attribute('full-path') as string;
        this.rootFile = await this.readXML(rootFilePath);
        this.rootFileFolderPath = rootFilePath.replace(
            /* Replace everything after first forward slash,
               or if no forward slash found, replace everything */
            /(\/.+$)|(^[^\/]+$)/,
            rootFilePath.includes('/') ? '/' : ''
        );
        this.loadManifest();
        // let files = await Filesystem.readdir({
        //     path: '/',
        //     directory: Directory.Documents,
        // });
    }

    private loadManifest(): Manifest {
        const manifestItems = this.rootFile!.package.manifest.items();
        this.manifest = manifestItems.reduce((obj: Manifest, item: EzXML) => ({
            ...obj,
            ...(item.attribute('id') ? {
                [item.attribute('id')!]: item.attribute('href')
            } : {})
        }), {});
        return this.manifest!;
    }

    async loadManifestBlobs(): Promise<Manifest> {
        let promises: Promise<string>[] = [];
        Object.values(this.manifest!).forEach(async file => {
            promises.push(
                this.zip!.file(this.rootFileFolderPath + file)!
                .async('blob')!
                .then(URL.createObjectURL)
            );
        });
        const blobs = await Promise.all(promises);
        this.manifestBlobs = Object.fromEntries(blobs.map((blob, i) =>
            [Object.values(this.manifest!)[i], blob]
        ))
        return this.manifestBlobs;
    }

    private async loadCoverImg(): Promise<string | undefined> {
        const coverId = this.rootFile!.package.metadata
            .items()
            .filter((obj: EzXML) => obj.attribute('name') === 'cover')
            ?.[0]?.attribute('content');
        const coverPath = this.manifest![coverId] ?? null
        if (coverPath) {
            return await this.zip!.file(this.rootFileFolderPath + coverPath)
                ?.async('blob')!
                .then(URL.createObjectURL);
        }
    }

    private async readXML(filepath: string): Promise<EzXML> {
        if (!this.zip) {
            throw 'Tried reading before opening file';
        }
        const xml = await this.zip!.file(filepath)!.async('text');
        const xmlObj = xml2js(xml);
        return new EzXML(xmlObj as Element);
    }

    private flattenNavMap(navItem: EzXML): EzXML[] {
        const items = [];
        if (navItem.navLabel && navItem.content) {
            items.push(navItem);
        }
        navItem.items().forEach(item => {
            if (item.name == 'navPoint') {
                items.push(...this.flattenNavMap(item));
            }
        });
        return items;
    }
}

interface ChaptersByFileName {
    [fileName: string]: Chapter
}

class EpubChapters implements Chapters {
    chaptersInOrder: Chapter[];
    chaptersByFileName: ChaptersByFileName;

    constructor(chapters: Chapter[]) {
        let uniqueChaptersFound = 0
        this.chaptersByFileName = chapters.reduce<ChaptersByFileName>(
            (total, chapter) => {
                if (!total[chapter.fileName]) {
                    total[chapter.fileName] = chapter;
                    total[chapter.fileName].index = uniqueChaptersFound;
                    uniqueChaptersFound += 1;
                }
                return total;
            }, {}
        );
        this.chaptersInOrder = Object.values(this.chaptersByFileName);
    }

    path(filepath: string): Chapter {
        return this.chaptersByFileName[filepath];
    }
    index(i: number): Chapter {
        return this.chaptersInOrder[i];
    }
    ordered(): Chapter[] {
        return this.chaptersInOrder;
    }
}

class EpubChapter implements Chapter {
    epub: Epub;
    title: string;
    fileName: string;
    size: number;
    index: number;

    constructor(epub: Epub, title: string, relativePath: string, index: number) {
        this.epub = epub;
        this.title = title;
        this.fileName = Helpers.parseFile(relativePath);
        // @ts-ignore
        this.size = this.loadFile(this.fileName)._data.uncompressedSize;
        this.index = index;
    }

    async loadHTML({ changeChapter }: HTMLOptions): Promise<HTMLElement[]> {
        let file = this.loadFile(this.fileName);
        let text = await file?.async('text')!;
        await this.epub.loadManifestBlobs();
        // Object.entries(this.epub.manifestBlobs!).forEach(([file, blob]) => {
        //     text = text.replaceAll(file, blob);
        // })
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(text, 'text/xml');
        const html = $(htmlDoc).find('html').children();
        html.find('a[href]').each((_, elem) => {
            const baseLink = Helpers.parseFile($(elem).attr('href')!);
            const isInManifest = Object.keys(this.epub.manifestBlobs!).find(path =>
                path.endsWith(baseLink)
            );
            if (isInManifest) {
                $(elem).on('click', (e) => {
                    e.preventDefault();
                    changeChapter(this.epub.chapters!.path(baseLink));
                });
            } else {
                $(elem).attr('target', '_blank');
            }
        });
        html.find('image, img').map(async (_, elem) => {
            const imgPath = $(elem).attr('src');
            if (imgPath) {
                const imgFileName = Helpers.parseFile(imgPath);
                const file = this.loadFile(imgFileName);
                const blob = await file.async('blob');
                const newURL = URL.createObjectURL(blob);
                $(elem).attr('src', newURL);
            }
        })
        html.find("*").filter((_, elem) => {
            return !![...elem.childNodes]
                .find(node =>
                    node.nodeType === Node.TEXT_NODE
                    && node.parentElement === elem
                );
        }).each((i, elem) => {
            // for (let node of Object.values(elem.childNodes)) {
            //     if (node.nodeType !== Node.TEXT_NODE) {
            //         continue;
            //     }
            //     const parentSpan = document.createElement('span');
            //     node.textContent
            //         ?.replaceAll(/\s+/g, ' ') // Changes all strings of white space characters into a single space
            //         ?.split(' ')
            //         .filter(txt => txt)
            //         .forEach(txt => {
            //             const wordElem = document.createElement('span');
            //             wordElem.textContent = txt + ' ';
            //             parentSpan.append(wordElem);
            //         });
            //     node.replaceWith(parentSpan);
            // }
        });
        return html.get();
    }

    loadFile(path: string) {
        const urlSafePath = decodeURIComponent(path);
        const regexSafePath = urlSafePath.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(regexSafePath);
        let file = this.epub.zip!.file(regex)[0];
        return file;
    }
}

class EzXML {

    [key: string]: any;
    
    xml: Element;

    constructor(xml: Element) {
        this.xml = xml;
        return new Proxy(this, { get: (target, key) => {
            if (target[key as keyof EzXML]) {
                return this[key as keyof EzXML];
            }
            if (['name', 'type'].includes(key as string)) {
                return this.xml[key as keyof Element];
            }
            if (key === 'innerText') {
                return this.xml.elements?.[0].text ?? '';
            }
            if (!this.xml.elements) {
                throw 'xml object had no elements';
            }
            const elems = this.xml.elements?.filter(elem => elem.name === key)!;
            if (elems?.length < 1) {
                return undefined;
            }
            if (elems?.length > 1) {
                console.error(`xml object has more than one element matching "${key as string}". Returning first item.`);
                return elems[0];
            }
            return new EzXML(elems[0]);
        }});
    }

    attribute(str: string): string | number | undefined {
        return this.xml.attributes?.[str];
    }

    items(): EzXML[] {
        return this.xml.elements?.map(e => new EzXML(e)) ?? [];
    }

    elems(str?: string): EzXML[] {
        return this.xml.elements
            ?.filter(elem => str === undefined || elem.name === str)
            ?.map(elem => new EzXML(elem))
            ?? [];
    }
}


class Helpers {
    /* Given a file path, parses out the file name */
    static parseFile(str: string): string {
        return str.replaceAll(/(.*\/)|((#|&|\?).*$)/g, '')
    }
}