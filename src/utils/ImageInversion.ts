/**
 * Dark themes: books often have ornaments, section breaks and illustrations
 * on bright white backgrounds. Those are inverted so they don't glare.
 * Photos and colorful images (covers, plates) are left alone, since inverting
 * them would turn them into negatives.
 */

const INVERT_FILTER = 'invert(0.9) hue-rotate(180deg)';

/** Results by image URL; each image is only analysed once. */
const analysis = new Map<string, Promise<boolean>>();

/** Whether an image is mostly light and colorless: paper with ink, or line art on transparency. */
function isLightLineArt(src: string): Promise<boolean> {
    let result = analysis.get(src);
    if (!result) {
        result = (async () => {
            const img = new Image();
            img.src = src;
            await img.decode();
            const scale = Math.min(1, 48 / Math.max(img.naturalWidth, img.naturalHeight));
            const width = Math.max(1, Math.round(img.naturalWidth * scale));
            const height = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) {
                return false;
            }
            context.drawImage(img, 0, 0, width, height);
            const pixels = context.getImageData(0, 0, width, height).data;
            let light = 0;
            let colorful = 0;
            const total = width * height;
            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i + 3] < 26) {
                    light++; // Transparent: the page shows through, i.e. "paper".
                    continue;
                }
                const r = pixels[i] / 255;
                const g = pixels[i + 1] / 255;
                const b = pixels[i + 2] / 255;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                const saturation = max === 0 ? 0 : (max - min) / max;
                if (luminance > 0.8) {
                    light++;
                }
                if (saturation > 0.35 && luminance > 0.15) {
                    colorful++;
                }
            }
            return light / total > 0.6 && colorful / total < 0.15;
        })().catch(() => false);
        analysis.set(src, result);
    }
    return result;
}

function imageSource(element: Element): string | null {
    if (element instanceof HTMLImageElement) {
        return element.currentSrc || element.src || null;
    }
    // An <svg> wrapping an <image> (common for full-page images and covers).
    const image = element.querySelector('image');
    return image?.getAttribute('href') ?? image?.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? null;
}

/** Inverts the chapter's light line-art images, or restores them when `enabled` is false. */
export function updateImageInversion(contents: HTMLElement, enabled: boolean) {
    contents.querySelectorAll<HTMLElement | SVGElement>('img, svg').forEach(element => {
        if (!enabled) {
            element.style.filter = '';
            return;
        }
        const src = imageSource(element);
        if (!src) {
            return;
        }
        isLightLineArt(src).then(invert => {
            element.style.filter = invert ? INVERT_FILTER : '';
        });
    });
}
