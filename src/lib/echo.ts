/**
 * echo.ts — makes the reader's text selection visible inside the loupe.
 *
 * WHY THIS FILE EXISTS. The glass shows a live clone of the sheet. A clone has
 * the same elements and the same words, but the selection is not in the DOM: it
 * lives in the browser's own selection model, attached to the original text
 * nodes. Cloning cannot copy it. So when a reader highlights a line and moves
 * the glass over it, the glass shows unhighlighted text - which is what the
 * screenshots showed, and what this file fixes.
 *
 * HOW. Every node in a tree can be named by the list of child indices you
 * follow to reach it from the root. The clone is structurally identical to the
 * sheet, so the same list reaches the corresponding node in the clone. Rebuild
 * each selection range against the clone, hand the ranges to the CSS Custom
 * Highlight API, and style them with ::highlight(cv-echo) to match ::selection
 * exactly. The browser paints them; nothing is inserted, nothing re-renders.
 *
 * FALLBACK. If the API is missing, every function here becomes a no-op and the
 * glass simply magnifies unhighlighted text. Nothing throws, nothing is left
 * half-registered.
 */

/** The name the highlight is registered under, and in `::highlight(cv-echo)`. */
export const ECHO_NAME = "cv-echo";

/** The smallest shape the path walk needs. Lets the tests use plain objects. */
export type ChildTree = { readonly childNodes: ArrayLike<ChildTree> };

/**
 * The child-index path from `root` down to `node`, or null when `node` is not
 * inside `root`. An empty array means "root itself".
 */
export function pathOf(
  root: ChildTree,
  node: ChildTree,
  parentOf: (child: ChildTree) => ChildTree | null,
): number[] | null {
  const path: number[] = [];
  let current: ChildTree | null = node;

  while (current && current !== root) {
    const parent = parentOf(current);
    if (!parent) return null;
    const children = parent.childNodes;
    let index = -1;
    for (let i = 0; i < children.length; i += 1) {
      if (children[i] === current) {
        index = i;
        break;
      }
    }
    if (index < 0) return null;
    path.push(index);
    current = parent;
  }

  if (current !== root) return null;
  return path.reverse();
}

/** Walk a path built by pathOf. Returns null if the trees have diverged. */
export function nodeAt<T extends ChildTree>(root: T, path: number[]): T | null {
  let current: ChildTree = root;
  for (const index of path) {
    const next = current.childNodes[index];
    if (!next) return null;
    current = next;
  }
  return current as T;
}

/** Is the Custom Highlight API usable in this browser? */
export function echoSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof CSS !== "undefined" &&
    "highlights" in CSS &&
    typeof (window as unknown as { Highlight?: unknown }).Highlight ===
      "function"
  );
}

const domParent = (child: ChildTree): ChildTree | null =>
  (child as unknown as Node).parentNode as unknown as ChildTree | null;

/**
 * Rebuild the live selection against `clone`.
 *
 * Only ranges that are wholly inside `source` are mapped; a selection that
 * started in the toolbar and ended on the page contributes nothing, which is
 * the honest answer rather than a guess. Collapsed ranges are skipped: an empty
 * highlight is a wasted paint.
 */
export function cloneSelectionRanges(
  selection: Selection | null,
  source: Node,
  clone: Node,
): Range[] {
  if (!selection || selection.rangeCount === 0) return [];
  const out: Range[] = [];

  for (let i = 0; i < selection.rangeCount; i += 1) {
    const range = selection.getRangeAt(i);
    if (range.collapsed) continue;
    if (!source.contains(range.startContainer)) continue;
    if (!source.contains(range.endContainer)) continue;

    const startPath = pathOf(
      source as unknown as ChildTree,
      range.startContainer as unknown as ChildTree,
      domParent,
    );
    const endPath = pathOf(
      source as unknown as ChildTree,
      range.endContainer as unknown as ChildTree,
      domParent,
    );
    if (!startPath || !endPath) continue;

    const startNode = nodeAt(clone as unknown as ChildTree, startPath);
    const endNode = nodeAt(clone as unknown as ChildTree, endPath);
    if (!startNode || !endNode) continue;

    try {
      const copy = document.createRange();
      copy.setStart(startNode as unknown as Node, range.startOffset);
      copy.setEnd(endNode as unknown as Node, range.endOffset);
      out.push(copy);
    } catch {
      /* Offsets can be stale by a frame while the clone is being replaced.
         One dropped highlight is not worth an exception. */
    }
  }

  return out;
}

/** Register the ranges. Replaces whatever was registered before. */
export function paintEcho(ranges: Range[]): void {
  if (!echoSupported()) return;
  const registry = (CSS as unknown as { highlights: Map<string, unknown> })
    .highlights;
  if (ranges.length === 0) {
    registry.delete(ECHO_NAME);
    return;
  }
  try {
    const Ctor = (window as unknown as {
      Highlight: new (...ranges: Range[]) => unknown;
    }).Highlight;
    registry.set(ECHO_NAME, new Ctor(...ranges));
  } catch {
    registry.delete(ECHO_NAME);
  }
}

/** Unregister. Always call this when the glass or the window closes. */
export function clearEcho(): void {
  if (!echoSupported()) return;
  (CSS as unknown as { highlights: Map<string, unknown> }).highlights.delete(
    ECHO_NAME,
  );
}
