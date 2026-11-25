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

function scaleNumber(value: number | undefined, factor: number, min = 0): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  if (value === 0) return 0;
  return Math.max(min, Math.round(value * factor * 100) / 100);
}

function scaleInt(value: number | undefined, factor: number, min = 0): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  if (value === 0) return 0;
  return Math.max(min, Math.round(value * factor));
}

function scaleStyleProps(
  style: BuilderNode["style"],
  factor: number
): BuilderNode["style"] {
  return {
    ...style,
    ...(style.padding !== undefined ? { padding: scaleInt(style.padding, factor, 0) } : {}),
    ...(style.gap !== undefined ? { gap: scaleInt(style.gap, factor, 0) } : {}),
    ...(style.borderRadius !== undefined
      ? { borderRadius: scaleInt(style.borderRadius, factor, 0) }
      : {}),
    ...(style.borderWidth !== undefined
      ? { borderWidth: scaleNumber(style.borderWidth, factor, 0) }
      : {}),
    ...(style.shadowBlur !== undefined ? { shadowBlur: scaleInt(style.shadowBlur, factor, 0) } : {}),
    ...(style.shadowOffsetX !== undefined
      ? { shadowOffsetX: Math.round(style.shadowOffsetX * factor) }
      : {}),
    ...(style.shadowOffsetY !== undefined
      ? { shadowOffsetY: Math.round(style.shadowOffsetY * factor) }
      : {}),
  };
}

function scaleConfigProps(
  config: BuilderNode["config"],
  factor: number
): BuilderNode["config"] {
  return {
    ...config,
    ...(config.fontSize !== undefined ? { fontSize: scaleInt(config.fontSize, factor, 6) } : {}),
    ...(config.letterSpacing !== undefined
      ? { letterSpacing: Math.round(config.letterSpacing * factor * 100) / 100 }
      : {}),
    ...(config.maxWidth !== undefined ? { maxWidth: scaleInt(config.maxWidth, factor, 20) } : {}),
    ...(config.gallerySpacing !== undefined
      ? { gallerySpacing: scaleInt(config.gallerySpacing, factor, 0) }
      : {}),
    ...(config.separatorThickness !== undefined
      ? { separatorThickness: scaleInt(config.separatorThickness, factor, 1) }
      : {}),
  };
}

/**
 * Applies a proportional affine coordinate transformation to a container and all its
 * descendants relative to an initial `initialNodes` snapshot (preventing drift).
 */
export function applyProportionalContainerCornerScale(
  initialNodes: BuilderNode[],
  containerId: string,
  targetRect: { x: number; y: number; width: number; height: number }
): BuilderNode[] {
  const initParent = initialNodes.find((n) => n.id === containerId);
  if (!initParent || initParent.width <= 0 || initParent.height <= 0) {
    return initialNodes;
  }

  const scaleX = targetRect.width / initParent.width;
  const scaleY = targetRect.height / initParent.height;
  const uniformScale = (scaleX + scaleY) / 2;

  // Collect all descendants of containerId via BFS
  const descendantIds = new Set<string>();
  const queue: string[] = [containerId];
  while (queue.length > 0) {
    const pid = queue.shift()!;
    for (const candidate of initialNodes) {
      if (candidate.parentId === pid && !descendantIds.has(candidate.id)) {
        descendantIds.add(candidate.id);
        if (isContainerType(candidate.type)) {
          queue.push(candidate.id);
        }
      }
    }
  }

  return initialNodes.map((node) => {
    if (node.id === containerId) {
      return {
        ...node,
        x: Math.round(targetRect.x),
        y: Math.round(targetRect.y),
        width: Math.round(targetRect.width),
        height: Math.round(targetRect.height),
        style: scaleStyleProps(node.style, uniformScale),
      };
    }

    if (descendantIds.has(node.id)) {
      const scaledW = Math.max(4, Math.round(node.width * scaleX));
      const scaledH = Math.max(4, Math.round(node.height * scaleY));
      const nextResp = node.responsive
        ? {
            ...node.responsive,
            ...(node.responsive.paddingOverride
              ? {
                  paddingOverride: {
                    ...(node.responsive.paddingOverride.tablet !== undefined
                      ? {
                          tablet: scaleInt(node.responsive.paddingOverride.tablet, uniformScale, 0),
                        }
                      : {}),
                    ...(node.responsive.paddingOverride.mobile !== undefined
                      ? {
                          mobile: scaleInt(node.responsive.paddingOverride.mobile, uniformScale, 0),
                        }
                      : {}),
                  },
                }
              : {}),
            ...(node.responsive.fontSizeOverride
              ? {
                  fontSizeOverride: {
                    ...(node.responsive.fontSizeOverride.tablet !== undefined
                      ? {
                          tablet: scaleInt(node.responsive.fontSizeOverride.tablet, uniformScale, 6),
                        }
                      : {}),
                    ...(node.responsive.fontSizeOverride.mobile !== undefined
                      ? {
                          mobile: scaleInt(node.responsive.fontSizeOverride.mobile, uniformScale, 6),
                        }
                      : {}),
                  },
                }
              : {}),
          }
        : node.responsive;

      return {
        ...node,
        x: Math.round(node.x * scaleX),
        y: Math.round(node.y * scaleY),
        width: scaledW,
        height: scaledH,
        style: scaleStyleProps(node.style, uniformScale),
        config: scaleConfigProps(node.config, uniformScale),
        responsive: nextResp,
      };
    }

    return node;
  });
}
