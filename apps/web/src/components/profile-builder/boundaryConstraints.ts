import { BuilderNode } from "./profileBuilderTypes";
import { PROFILE_BUILDER_REGISTRY, isContainerType } from "./componentRegistry";

/**
 * Clamps a child node's position and dimensions strictly inside its parent's
 * local coordinate bounds `[0, parent.width] × [0, parent.height]`.
 */
export function clampNodeToParent(
  node: BuilderNode,
  parent: BuilderNode
): Pick<BuilderNode, "x" | "y" | "width" | "height"> {
  const reg = PROFILE_BUILDER_REGISTRY[node.type];
  const minW = reg?.minWidth ?? 20;
  const minH = reg?.minHeight ?? 12;

  const maxParentW = Math.max(0, parent.width);
  const maxParentH = Math.max(0, parent.height);

  // Preserve child dimensions unless the parent itself is smaller than the child
  const clampedW =
    node.width > maxParentW
      ? Math.max(Math.min(minW, maxParentW), maxParentW)
      : Math.max(minW, node.width);
  const clampedH =
    node.height > maxParentH
      ? Math.max(Math.min(minH, maxParentH), maxParentH)
      : Math.max(minH, node.height);

  const maxX = Math.max(0, maxParentW - clampedW);
  const maxY = Math.max(0, maxParentH - clampedH);

  return {
    x: Math.round(Math.max(0, Math.min(maxX, node.x))),
    y: Math.round(Math.max(0, Math.min(maxY, node.y))),
    width: Math.round(clampedW),
    height: Math.round(clampedH),
  };
}

/**
 * Recursively constrains all descendants of `parentId` inside the parent's
 * current dimensions without stretching children when the parent expands.
 */
export function constrainDescendantsToParent(
  parentId: string,
  nodes: BuilderNode[]
): BuilderNode[] {
  const map = new Map<string, BuilderNode>();
  nodes.forEach((n) => map.set(n.id, n));

  const visitChildren = (curParentId: string, visited: Set<string>) => {
    if (visited.has(curParentId)) return;
    visited.add(curParentId);
    const parent = map.get(curParentId);
    if (!parent || !isContainerType(parent.type)) return;

    for (const [id, child] of map.entries()) {
      if (child.parentId !== curParentId) continue;
      const clamped = clampNodeToParent(child, parent);
      const changed =
        clamped.x !== child.x ||
        clamped.y !== child.y ||
        clamped.width !== child.width ||
        clamped.height !== child.height;
      if (changed) {
        map.set(id, { ...child, ...clamped });
      }
      if (isContainerType(child.type)) {
        visitChildren(id, visited);
      }
    }
  };

  visitChildren(parentId, new Set());
  return nodes.map((n) => map.get(n.id) || n);
}
