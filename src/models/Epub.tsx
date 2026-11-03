import JSZip from 'jszip';
import { xml2js, Element } from 'xml-js';
import { Chapter, Chapters, Ebook, HTMLOptions, Metadata } from './Ebook';
import { LoadLibraryParams } from "../contexts/LibraryContext";

interface ManifestItem {
    id: string;
    /** Full path of the file inside the zip (resolved and URL-decoded). */
    path: string;
    mediaType?: string;
    properties: string[];
}

/** An opened EPUB: the zip plus its parsed package document. */
interface Package {
    zip: JSZip;
    opf: EzXML;
    opfPath: string;
    manifest: { [id: string]: ManifestItem };
    /** Lower-cased zip paths, for case-insensitive lookups. */
    lowerCasePaths: Map<string, string>;
}

const XLINK_NS = 'http://www.w3.org/1999/xlink';

export default class Epub extends Ebook {

    /** The book while it's open for reading; closed again by close(). */
    private session?: Promise<Package>;
    private chapters?: EpubChapters;
    /** Object URLs for the images of the chapter currently displayed. */
    private objectUrls: string[] = [];

    async loadMetadata({ reload, reloadStatsOnly }: LoadLibraryParams = {}): Promise<Metadata> {
        let metadata = await this.getCachedMetadata();
        if (metadata && reloadStatsOnly) {
            metadata = {
                ...metadata,
                stats: await this.getStats(),
                progress: await this.loadSpot(),
            };
            await this.setCachedMetadata(metadata);
        }
        if (!metadata || reload) {
            // Don't keep the whole book in memory just to show it in the library.
            const pkg = this.session ? await this.session : await this.readPackage();
            const metadataObj = pkg.opf.package?.metadata;
            const texts = (name: string): string[] => (metadataObj?.elems(name) ?? [])
                .map((elem: EzXML) => elem.innerText.trim())
                .filter(Boolean);
            metadata = {
                filePath: this.filePath,
                title: texts('dc:title')[0],
                author: texts('dc:creator').join(' & ') || undefined,
                language: texts('dc:language').join(', ') || undefined,
                date: texts('dc:date')[0],
                description: texts('dc:description')[0],
                subjects: texts('dc:subject'),
                coverImgPath: await this.loadCoverImg(pkg),
                stats: await this.getStats(),
                progress: await this.loadSpot(),
            };
            await this.setCachedMetadata(metadata);
        }
        return metadata;
    }

    async loadChapters(): Promise<Chapters> {
        if (this.chapters) {
            return this.chapters;
        }
        const pkg = await this.open();
        const titles = await this.loadTocTitles(pkg);

        // Reading order comes from the spine; fall back to the table of contents.
        let paths: string[] = [];
        for (const itemref of pkg.opf.package?.spine?.elems('itemref') ?? []) {
            const item = pkg.manifest[String(itemref.attribute('idref'))];
            if (item && !paths.includes(item.path)) {
                paths.push(item.path);
            }
        }
        if (paths.length === 0) {
            paths = [...titles.keys()];
        }
        const chapters = paths
            .filter(path => findFile(pkg, path))
            .map((path, i) => new EpubChapter(this, titles.get(path), path, i, fileSize(findFile(pkg, path))));
        if (chapters.length === 0) {
            throw new Error('This book has no readable chapters.');
        }
        this.chapters = new EpubChapters(chapters);
        return this.chapters;
    }

    /** Releases the opened book and its images. */
    close() {
        this.revokeObjectUrls();
        this.session = undefined;
        this.chapters = undefined;
    }

    async renderChapter(chapter: EpubChapter, { changeChapter, scrollToAnchor }: HTMLOptions): Promise<HTMLElement[]> {
        const pkg = await this.open();
        const file = findFile(pkg, chapter.path);
        if (!file) {
            throw new Error(`The chapter file "${chapter.path}" is missing from this book.`);
        }
        const doc = parseXHTML(await file.async('text'));
        const body = doc.getElementsByTagName('body')[0] ?? doc.documentElement;

        // The reader applies its own typography; the book's stylesheets and
        // scripts must not leak into the app.
        body.querySelectorAll('script, style, link').forEach(elem => elem.remove());

        body.querySelectorAll('a[href]').forEach(link => {
            const href = link.getAttribute('href')!.trim();
            if (isExternalUrl(href)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener');
                link.addEventListener('click', e => e.stopPropagation());
                return;
            }
            const hashIndex = href.indexOf('#');
            const anchor = hashIndex >= 0 ? safeDecode(href.slice(hashIndex + 1)) : undefined;
            const targetPath = href.startsWith('#') ? chapter.path : resolvePath(chapter.path, href);
            link.addEventListener('click', e => {
                // Don't also turn the page or toggle the menu.
                e.preventDefault();
                e.stopPropagation();
                if (targetPath === chapter.path) {
                    if (anchor) {
                        scrollToAnchor(anchor);
                    }
                    return;
                }
                const target = this.chapters?.path(targetPath);
                if (target) {
                    changeChapter(target, anchor);
                }
            });
        });

        // Swap image references (<img src> and SVG <image href>) for the files in the zip.
        // Done before the nodes are inserted, so the browser never requests the relative paths.
        this.revokeObjectUrls();
        const mediaTypes = new Map(Object.values(pkg.manifest).map(item => [item.path, item.mediaType]));
        // `srcset` (and <picture> sources) would win over the rewritten `src` and
        // point at paths that don't exist outside the zip. Use the sharpest
        // candidate from the zip instead.
        body.querySelectorAll('picture source').forEach(source => source.remove());
        await Promise.all([...body.querySelectorAll('img, image')].map(async elem => {
            const isImg = elem.localName === 'img';
            let src = isImg
                ? elem.getAttribute('src')
                : elem.getAttribute('href') ?? elem.getAttributeNS(XLINK_NS, 'href');
            if (isImg && elem.hasAttribute('srcset')) {
                const best = sharpestCandidate(elem.getAttribute('srcset')!);
                if (best && !isExternalUrl(best) && findFile(pkg, resolvePath(chapter.path, best))) {
                    src = best;
                }
                elem.removeAttribute('srcset');
                elem.removeAttribute('sizes');
            }
            if (!src || isExternalUrl(src)) {
                return;
            }
            const path = resolvePath(chapter.path, src);
            const imageFile = findFile(pkg, path);
            if (!imageFile) {
                return;
            }
            const blob = new Blob([await imageFile.async('blob')], {
                type: mediaTypes.get(path) ?? guessImageType(path),
            });
            const url = URL.createObjectURL(blob);
            this.objectUrls.push(url);
            // SVG 2 `href` takes precedence over `xlink:href`.
            elem.setAttribute(isImg ? 'src' : 'href', url);
        }));

        return [...body.children] as HTMLElement[];
    }

    private open(): Promise<Package> {
        if (!this.session) {
            this.session = this.readPackage().catch(e => {
                this.session = undefined;
                throw e;
            });
        }
        return this.session;
    }

    private async readPackage(): Promise<Package> {
        let zip: JSZip;
        if (this.readFileData) {
            const data = await this.readFileData();
            zip = await JSZip.loadAsync(data, typeof data === 'string' ? { base64: true } : undefined);
        } else {
            const res = await fetch(this.filePath);
            if (!res.ok) {
                throw new Error(`Couldn't load the book (HTTP ${res.status}).`);
            }
            zip = await JSZip.loadAsync(await res.blob());
        }
        const lowerCasePaths = new Map(Object.keys(zip.files).map(name => [name.toLowerCase(), name]));
        const partial = { zip, lowerCasePaths };

        const container = await readXML(partial, 'META-INF/container.xml');
        const opfPath = container.container?.rootfiles?.elems('rootfile')[0]?.attribute('full-path');
        if (!opfPath) {
            throw new Error('This file is not a valid EPUB (it has no package document).');
        }
        const opf = await readXML(partial, String(opfPath));
        const manifest: Package['manifest'] = {};
        for (const item of opf.package?.manifest?.elems('item') ?? []) {
            const id = item.attribute('id');
            const href = item.attribute('href');
            if (id === undefined || href === undefined) {
                continue;
            }
            manifest[String(id)] = {
                id: String(id),
                path: resolvePath(String(opfPath), String(href)),
                mediaType: item.attribute('media-type') as string | undefined,
                properties: String(item.attribute('properties') ?? '').split(/\s+/).filter(Boolean),
            };
        }
        return { zip, opf, opfPath: String(opfPath), manifest, lowerCasePaths };
    }

    /**
     * Chapter titles by file path, from the EPUB 2 NCX or the EPUB 3 navigation
     * document. A file can hold several chapters; it's labelled with the first.
     * Neither is required, so failures just mean untitled chapters.
     */
    private async loadTocTitles(pkg: Package): Promise<Map<string, string>> {
        const titles = new Map<string, string>();
        const add = (basePath: string, href: string | undefined, label: string | undefined) => {
            if (!href || !label?.trim() || isExternalUrl(href)) {
                return;
            }
            const path = resolvePath(basePath, href);
            if (!titles.has(path)) {
                titles.set(path, label.trim().replace(/\s+/g, ' '));
            }
        };
        const items = Object.values(pkg.manifest);
        try {
            const tocId = pkg.opf.package?.spine?.attribute('toc');
            const ncx = (tocId !== undefined ? pkg.manifest[String(tocId)] : undefined)
                ?? items.find(item => item.mediaType === 'application/x-dtbncx+xml');
            if (ncx && findFile(pkg, ncx.path)) {
                const ncxDoc = await readXML(pkg, ncx.path);
                const walk = (navPoint: EzXML) => {
                    add(ncx.path, navPoint.content?.attribute('src') as string | undefined, navPoint.navLabel?.text?.innerText);
                    navPoint.elems('navPoint').forEach(walk);
                };
                ncxDoc.ncx?.navMap?.elems('navPoint').forEach(walk);
            }
        } catch (e) {
            console.warn('Could not read the NCX table of contents', e);
        }
        if (titles.size === 0) {
            try {
                const nav = items.find(item => item.properties.includes('nav'));
                const navFile = nav && findFile(pkg, nav.path);
                if (nav && navFile) {
                    const navDoc = parseXHTML(await navFile.async('text'));
                    const navs = [...navDoc.getElementsByTagName('nav')];
                    const toc = navs.find(n => (n.getAttribute('epub:type') ?? n.getAttributeNS('http://www.idpf.org/2007/ops', 'type'))?.split(/\s+/).includes('toc'))
                        ?? navs[0];
                    toc?.querySelectorAll('a[href]').forEach(a => add(nav.path, a.getAttribute('href') ?? undefined, a.textContent ?? undefined));
                }
            } catch (e) {
                console.warn('Could not read the EPUB 3 navigation document', e);
            }
        }
        return titles;
    }

    private async loadCoverImg(pkg: Package): Promise<string | undefined> {
        try {
            // EPUB 2: <meta name="cover" content="manifest-id">. EPUB 3: properties="cover-image".
            const coverId = pkg.opf.package?.metadata?.elems('meta')
                .find((meta: EzXML) => meta.attribute('name') === 'cover')
                ?.attribute('content');
            const item = (coverId !== undefined ? pkg.manifest[String(coverId)] : undefined)
                ?? Object.values(pkg.manifest).find(i => i.properties.includes('cover-image'));
            const file = item && findFile(pkg, item.path);
            if (!item || !file) {
                return undefined;
            }
            const base64 = await file.async('base64');
            return `data:${item.mediaType ?? guessImageType(item.path)};base64,${base64}`;
        } catch (e) {
            console.warn('Could not load the cover image', e);
            return undefined;
        }
    }

    private revokeObjectUrls() {
        this.objectUrls.forEach(url => URL.revokeObjectURL(url));
        this.objectUrls = [];
    }
}

interface ChaptersByPath {
    [path: string]: Chapter
}

class EpubChapters implements Chapters {
    chaptersInOrder: Chapter[];
    chaptersByPath: ChaptersByPath;

    constructor(chapters: Chapter[]) {
        this.chaptersInOrder = chapters;
        this.chaptersByPath = Object.fromEntries(chapters.map(chapter => [chapter.path, chapter]));
    }

    path(path: string): Chapter | undefined {
        return this.chaptersByPath[path];
    }
    index(i: number): Chapter | undefined {
        return this.chaptersInOrder[i];
    }
    ordered(): Chapter[] {
        return this.chaptersInOrder;
    }
}

class EpubChapter implements Chapter {
    constructor(
        private epub: Epub,
        public title: string | undefined,
        public path: string,
        public index: number,
        public size: number,
    ) {}

    loadHTML(options: HTMLOptions): Promise<HTMLElement[]> {
        return this.epub.renderChapter(this, options);
    }
}

/** Finds a file in the zip by exact path, falling back to a case-insensitive match. */
function findFile(pkg: Pick<Package, 'zip' | 'lowerCasePaths'>, path: string): JSZip.JSZipObject | null {
    const file = pkg.zip.file(path);
    if (file) {
        return file;
    }
    const actual = pkg.lowerCasePaths.get(path.toLowerCase());
    return actual ? pkg.zip.file(actual) : null;
}

function fileSize(file: JSZip.JSZipObject | null): number {
    // JSZip doesn't expose the size publicly.
    return (file as unknown as { _data?: { uncompressedSize?: number } })?._data?.uncompressedSize ?? 0;
}

async function readXML(pkg: Pick<Package, 'zip' | 'lowerCasePaths'>, path: string): Promise<EzXML> {
    const file = findFile(pkg, path);
    if (!file) {
        throw new Error(`This EPUB is missing "${path}".`);
    }
    return new EzXML(xml2js(await file.async('text')) as Element);
}

/** Parses an (X)HTML document, falling back to the HTML parser when it isn't well-formed XML. */
function parseXHTML(text: string): Document {
    const xml = new DOMParser().parseFromString(text, 'application/xhtml+xml');
    if (xml.getElementsByTagName('parsererror').length === 0) {
        return xml;
    }
    // e.g. HTML entities such as &nbsp; that XML doesn't define.
    return new DOMParser().parseFromString(text, 'text/html');
}

function isExternalUrl(href: string): boolean {
    return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/**
 * The URL of the highest-resolution candidate in a `srcset`, e.g.
 * "a.png 1x, a-2x.png 2x" -> "a-2x.png". Width descriptors ("640w") count as larger.
 */
export function sharpestCandidate(srcset: string): string | undefined {
    let best: { url: string, size: number } | undefined;
    for (const candidate of srcset.split(',')) {
        const [url, descriptor = '1x'] = candidate.trim().split(/\s+/);
        if (!url) {
            continue;
        }
        const size = parseFloat(descriptor) * (descriptor.endsWith('w') ? 1 : 1000) || 1000;
        if (!best || size > best.size) {
            best = { url, size };
        }
    }
    return best?.url;
}

function safeDecode(str: string): string {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}

/**
 * Resolves `href` (relative to the file at `basePath`, URL-encoded, possibly
 * with a #fragment or ?query) to a full path inside the zip.
 */
export function resolvePath(basePath: string, href: string): string {
    const decoded = safeDecode(href.replace(/[#?].*$/, ''));
    const parts = decoded.startsWith('/') ? [] : basePath.split('/').slice(0, -1);
    for (const segment of decoded.split('/')) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..') {
            parts.pop();
        } else {
            parts.push(segment);
        }
    }
    return parts.join('/');
}

function guessImageType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'png': return 'image/png';
        case 'gif': return 'image/gif';
        case 'svg': return 'image/svg+xml';
        case 'webp': return 'image/webp';
        default: return 'image/jpeg';
    }
}

/** Convenience wrapper around xml-js output: `node.child`, `.attribute()`, `.elems()`. */
class EzXML {

    [key: string]: any;

    xml: Element;

    constructor(xml: Element) {
        this.xml = xml;
        return new Proxy(this, { get: (target, key) => {
            if (typeof key !== 'string') {
                return undefined;
            }
            if (key in target) {
                return target[key as keyof EzXML];
            }
            if (key === 'name' || key === 'type') {
                return this.xml[key];
            }
            if (key === 'innerText') {
                return textOf(this.xml);
            }
            if (key === 'then') {
                // Not a thenable (so it can be returned from async functions).
                return undefined;
            }
            const elem = this.xml.elements?.find(e => e.name === key);
            return elem ? new EzXML(elem) : undefined;
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

function textOf(xml: Element): string {
    return (xml.elements ?? [])
        .map(e => e.type === 'text' || e.type === 'cdata' ? String(e.text ?? e.cdata ?? '') : textOf(e))
        .join('');
}
