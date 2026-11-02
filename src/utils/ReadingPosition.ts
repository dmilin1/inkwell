/**
 * Layout-independent reading positions.
 *
 * A pixel scroll offset stops pointing at the same text as soon as the text
 * reflows: when the iPhone Duo folds or unfolds, when the device rotates, when
 * the window is resized, or when the font size / margins change. Instead we
 * remember *which piece of text* is at the top of the reader (a path to a DOM
 * node plus a character offset) and scroll back to it after any reflow.
 *
 * The anchor is found with a binary search over the bounding boxes of the
 * chapter's text nodes, rather than hit-testing (caretRangeFromPoint), so it
 * isn't affected by overlays such as the settings menu, by gaps between
 * paragraphs, or by paragraph indentation.
 */

export interface ReadingAnchor {
    /** childNodes indices from the contents container down to the anchor node. */
    path: number[],
    /** Character offset within a text node (0 for element anchors such as images). */
    offset: number,
}

export interface ReadingPosition {
    anchor?: ReadingAnchor,
    /** scrollTop / scrollHeight, used as a fallback if the anchor can't be resolved. */
    chapterProgress: number,
    atStart: boolean,
    atEnd: boolean,
}

/** Tolerance (px) for treating a line as fully visible / a scroll as at an edge. */
const EPSILON = 2;

const anchorableNodeCache = new WeakMap<HTMLElement, Node[]>();

/** Must be called whenever the contents of the reader are replaced. */
export function resetPositionCache(contents: HTMLElement) {
    anchorableNodeCache.delete(contents);
}

function isAnchorableElement(node: Node): node is Element {
    return node instanceof Element && (node.tagName.toLowerCase() === 'img' || node.tagName.toLowerCase() === 'svg');
}

function getAnchorableNodes(contents: HTMLElement): Node[] {
    const cached = anchorableNodeCache.get(contents);
    if (cached) {
        return cached;
    }
    const nodes: Node[] = [];
    const walker = document.createTreeWalker(
        contents,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
            acceptNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (!node.textContent?.trim() || node.parentElement?.closest('svg')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                }
                if (isAnchorableElement(node)) {
                    // Accept the image itself; its children (if any) are covered by its box.
                    return node.parentElement?.closest('svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                }
                // Not an anchor itself, but its descendants may be.
                return NodeFilter.FILTER_SKIP;
            },
        },
    );
    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }
    anchorableNodeCache.set(contents, nodes);
    return nodes;
}

const scratchRange = () => document.createRange();

function nodeRect(node: Node): DOMRect {
    if (node.nodeType === Node.TEXT_NODE) {
        const range = scratchRange();
        range.selectNodeContents(node);
        return range.getBoundingClientRect();
    }
    return (node as Element).getBoundingClientRect();
}

function isEmptyRect(rect: DOMRect) {
    return rect.width === 0 && rect.height === 0;
}

function charRect(node: Text, offset: number): DOMRect {
    const length = node.length;
    const range = scratchRange();
    const start = Math.max(0, Math.min(offset, length - 1));
    range.setStart(node, start);
    range.setEnd(node, start + 1);
    return range.getBoundingClientRect();
}

/** Index of the first item in [lo, hi) for which `pred` is true, or `hi` if none. */
function lowerBound(lo: number, hi: number, pred: (i: number) => boolean) {
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (pred(mid)) {
            hi = mid;
        } else {
            lo = mid + 1;
        }
    }
    return lo;
}

/** Top edge of the region the reader can actually see (excludes the container's top padding). */
function visibleTop(container: HTMLElement) {
    const paddingTop = parseFloat(getComputedStyle(container).paddingTop) || 0;
    return container.getBoundingClientRect().top + paddingTop;
}

function pathTo(contents: HTMLElement, node: Node): number[] | undefined {
    const path: number[] = [];
    let current: Node | null = node;
    while (current && current !== contents) {
        const parent: Node | null = current.parentNode;
        if (!parent) {
            return undefined;
        }
        path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
        current = parent;
    }
    return current === contents ? path : undefined;
}

function resolvePath(contents: HTMLElement, path: number[]): Node | undefined {
    let node: Node | undefined = contents;
    for (const index of path) {
        node = node?.childNodes[index];
        if (!node) {
            return undefined;
        }
    }
    return node;
}

/** Finds the first text position (or image) whose top edge is at or below `top`. */
function findAnchor(contents: HTMLElement, top: number): ReadingAnchor | undefined {
    const nodes = getAnchorableNodes(contents);
    const threshold = top - EPSILON;

    // Skip forward over nodes that are hidden (no layout box) so the search stays monotonic.
    const bottomOf = (i: number) => {
        for (let j = i; j < nodes.length; j++) {
            const rect = nodeRect(nodes[j]);
            if (!isEmptyRect(rect)) {
                return rect.bottom;
            }
        }
        return Number.POSITIVE_INFINITY;
    };

    // First node that extends below the top of the visible area.
    let i = lowerBound(0, nodes.length, (k) => bottomOf(k) > threshold);

    for (; i < nodes.length; i++) {
        const node = nodes[i];
        const rect = nodeRect(node);
        if (isEmptyRect(rect)) {
            continue;
        }
        if (node.nodeType !== Node.TEXT_NODE) {
            if (rect.top >= threshold) {
                const path = pathTo(contents, node);
                return path ? { path, offset: 0 } : undefined;
            }
            continue;
        }
        const text = node as Text;
        // First character in this node whose line is fully visible.
        let offset = lowerBound(0, text.length, (k) => {
            const r = charRect(text, k);
            return !isEmptyRect(r) && r.top >= threshold;
        });
        if (offset < text.length) {
            // Anchor on a visible character: whitespace may collapse or hang at a
            // line break after a reflow, which would report the wrong line.
            while (offset < text.length - 1 && /\s/.test(text.data[offset])) {
                offset++;
            }
            const path = pathTo(contents, text);
            return path ? { path, offset } : undefined;
        }
    }
    return undefined;
}

export function capturePosition(container: HTMLElement, contents: HTMLElement): ReadingPosition {
    const maxScroll = container.scrollHeight - container.clientHeight;
    const scrollTop = container.scrollTop;
    return {
        anchor: findAnchor(contents, visibleTop(container)),
        chapterProgress: container.scrollHeight > 0 ? scrollTop / container.scrollHeight : 0,
        atStart: scrollTop <= EPSILON,
        atEnd: maxScroll > EPSILON && scrollTop >= maxScroll - EPSILON,
    };
}

/** Pixel offset of the anchor's top edge from the top of the visible area, or undefined if unresolvable. */
function anchorDelta(container: HTMLElement, contents: HTMLElement, anchor: ReadingAnchor): number | undefined {
    const node = resolvePath(contents, anchor.path);
    if (!node) {
        return undefined;
    }
    let rect: DOMRect;
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node as Text;
        if (text.length === 0) {
            return undefined;
        }
        rect = charRect(text, anchor.offset);
    } else if (isAnchorableElement(node)) {
        rect = node.getBoundingClientRect();
    } else {
        return undefined;
    }
    if (isEmptyRect(rect)) {
        return undefined;
    }
    return rect.top - visibleTop(container);
}

/**
 * For paginated reading: where whole lines start and stop on the current page,
 * in viewport coordinates.
 * - `firstLineTop`: top of the first line that's fully visible.
 * - `cutLineTop`: top of the line cut off by the bottom edge, if any. Elements
 *   taller than the page (big images) never count as cut, so they're shown
 *   rather than hidden.
 * - `nextLineTop`: when nothing is cut, the top of the first content below the
 *   page (where the next page should start).
 */
export function pageLineBounds(container: HTMLElement, contents: HTMLElement): { firstLineTop?: number, cutLineTop?: number, nextLineTop?: number } {
    const rect = container.getBoundingClientRect();
    const top = visibleTop(container);
    const bottom = rect.bottom - (parseFloat(getComputedStyle(container).paddingBottom) || 0);

    let firstLineTop: number | undefined;
    const anchor = findAnchor(contents, top);
    if (anchor) {
        const delta = anchorDelta(container, contents, anchor);
        firstLineTop = delta === undefined ? undefined : top + delta;
    }

    const nodes = getAnchorableNodes(contents);
    const bottomOf = (i: number) => {
        for (let j = i; j < nodes.length; j++) {
            const r = nodeRect(nodes[j]);
            if (!isEmptyRect(r)) {
                return r.bottom;
            }
        }
        return Number.POSITIVE_INFINITY;
    };
    let cutLineTop: number | undefined;
    let nextLineTop: number | undefined;
    for (let i = lowerBound(0, nodes.length, k => bottomOf(k) > bottom + EPSILON); i < nodes.length; i++) {
        const node = nodes[i];
        const r = nodeRect(node);
        if (isEmptyRect(r)) {
            continue;
        }
        if (r.top >= bottom - EPSILON) {
            // The next content starts below the page; nothing is cut.
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node as Text;
                const first = lowerBound(0, text.length, k => !isEmptyRect(charRect(text, k)));
                nextLineTop = first < text.length ? charRect(text, first).top : r.top;
            } else {
                nextLineTop = r.top;
            }
            break;
        }
        if (node.nodeType !== Node.TEXT_NODE) {
            if (r.height < (bottom - top) * 0.9) {
                cutLineTop = r.top;
            }
            break;
        }
        const text = node as Text;
        const offset = lowerBound(0, text.length, k => {
            const c = charRect(text, k);
            return !isEmptyRect(c) && c.bottom > bottom + EPSILON;
        });
        if (offset < text.length) {
            const c = charRect(text, offset);
            if (c.top < bottom - EPSILON) {
                cutLineTop = c.top;
            } else {
                nextLineTop = c.top;
            }
        }
        break;
    }
    return { firstLineTop, cutLineTop, nextLineTop };
}

/** Finds an element in the chapter by its id (e.g. the target of a footnote link). */
export function findAnchorElement(contents: HTMLElement, id: string): Element | null {
    return contents.querySelector(`[id="${CSS.escape(id)}"]`)
        ?? contents.querySelector(`a[name="${CSS.escape(id)}"]`);
}

/** Scrolls `container` so that `element`'s top edge is at the top of the visible area. */
export function scrollElementToTop(container: HTMLElement, element: Element) {
    container.scrollTop += element.getBoundingClientRect().top - visibleTop(container);
}

/**
 * Scrolls `container` so that `position` is back at the top of the reader.
 * `legacyScrollTop` supports spots saved before anchors existed.
 * Returns the scrollTop that was applied.
 */
export function restorePosition(
    container: HTMLElement,
    contents: HTMLElement,
    position: Partial<ReadingPosition> | undefined,
    legacyScrollTop?: number,
): number {
    const scrollTo = (top: number) => {
        container.scrollTop = top;
        return container.scrollTop;
    };

    if (position?.atStart) {
        return scrollTo(0);
    }
    if (position?.atEnd) {
        return scrollTo(container.scrollHeight);
    }
    if (position?.anchor) {
        const delta = anchorDelta(container, contents, position.anchor);
        if (delta !== undefined) {
            return scrollTo(container.scrollTop + delta);
        }
    }
    if (position?.chapterProgress !== undefined) {
        return scrollTo(position.chapterProgress * container.scrollHeight);
    }
    return scrollTo(legacyScrollTop ?? 0);
}
