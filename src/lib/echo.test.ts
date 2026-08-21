import { describe, expect, it } from "vitest";
import { nodeAt, pathOf, type ChildTree } from "./echo";

/**
 * A tree of plain objects, shaped like the two properties the path walk uses.
 * vitest runs in the node environment here - no document, by design - so the
 * mapping is tested against a structure instead of a browser.
 */
type Fake = ChildTree & { name: string; parent: Fake | null };

function make(name: string, children: Fake[] = []): Fake {
  const node: Fake = { name, parent: null, childNodes: children };
  for (const child of children) child.parent = node;
  return node;
}

const parentOf = (child: ChildTree): ChildTree | null =>
  (child as Fake).parent;

describe("pathOf / nodeAt", () => {
  const leaf = make("leaf");
  const middle = make("middle", [make("other"), leaf]);
  const root = make("root", [make("head"), middle]);

  it("names a node by the indices that reach it", () => {
    expect(pathOf(root, leaf, parentOf)).toEqual([1, 1]);
  });

  it("calls the root itself an empty path", () => {
    expect(pathOf(root, root, parentOf)).toEqual([]);
  });

  it("refuses a node from another tree", () => {
    expect(pathOf(root, make("stranger"), parentOf)).toBeNull();
  });

  it("round-trips through a structurally identical copy", () => {
    /* The same shape, built separately: this is the clone in the loupe. */
    const copyLeaf = make("leaf");
    const copy = make("root", [
      make("head"),
      make("middle", [make("other"), copyLeaf]),
    ]);
    const path = pathOf(root, leaf, parentOf);
    expect(path).not.toBeNull();
    expect(nodeAt(copy, path as number[])).toBe(copyLeaf);
  });

  it("returns null when the copy is shorter than the path", () => {
    expect(nodeAt(make("root", [make("only")]), [4, 2])).toBeNull();
  });
});
