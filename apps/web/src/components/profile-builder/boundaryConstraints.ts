import { BuilderNode } from "./profileBuilderTypes";
import { PROFILE_BUILDER_REGISTRY, isContainerType } from "./componentRegistry";

/**
 * Clamps a child node's position and dimensions strictly inside its parent's
 * local coordinate bounds `[0, parent.width] × [0, parent.height]`.
 * Preserves aspect ratio when `node.aspectRatioLocked` is enabled and parent shrinks smaller than child.
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

  let clampedW: number;
  let clampedH: number;

  if (
    node.aspectRatioLocked &&
    node.width > 0 &&
    node.height > 0 &&
    (node.width > maxParentW || node.height > maxParentH)
  ) {
    const fitRatio = Math.min(maxParentW / node.width, maxParentH / node.height);
    clampedW = Math.max(1, Math.round(node.width * fitRatio));
    clampedH = Math.max(1, Math.round(node.height * fitRatio));
  } else {
    clampedW =
      node.width > maxParentW
        ? Math.max(Math.min(minW, maxParentW), maxParentW)
        : Math.max(Math.min(minW, maxParentW), node.width);
    clampedH =
      node.height > maxParentH
        ? Math.max(Math.min(minH, maxParentH), maxParentH)
        : Math.max(Math.min(minH, maxParentH), node.height);
  }

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
 * current dimensions without stretching fixed-size children when the parent expands.
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
    ...(config.fontSize !== undefined ? { fontSize: scaleInt(config.fontSize, factor, 8) } : {}),
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

function resizeSingleChildFromSnapshot(
  initChild: BuilderNode,
  initParent: BuilderNode,
  nextParent: BuilderNode,
  forceProportional: boolean
): BuilderNode {
  const reg = PROFILE_BUILDER_REGISTRY[initChild.type];
  const minW = reg?.minWidth ?? 16;
  const minH = reg?.minHeight ?? 12;

  const scaleX = nextParent.width / Math.max(1, initParent.width);
  const scaleY = nextParent.height / Math.max(1, initParent.height);
  const uniformScale = Math.min(scaleX, scaleY);

  const scaleMode = forceProportional
    ? "proportional"
    : initChild.responsive?.scaleMode || "fixed";

  let nextX = initChild.x;
  let nextY = initChild.y;
  let nextW = initChild.width;
  let nextH = initChild.height;
  let nextStyle = initChild.style;
  let nextConfig = initChild.config;
  let nextResp = initChild.responsive;

  if (scaleMode === "proportional") {
    nextX = Math.round(initChild.x * scaleX);
    nextY = Math.round(initChild.y * scaleY);
    if (initChild.aspectRatioLocked) {
      nextW = Math.max(minW, Math.round(initChild.width * uniformScale));
      nextH = Math.max(minH, Math.round(initChild.height * uniformScale));
    } else {
      nextW = Math.max(minW, Math.round(initChild.width * scaleX));
      nextH = Math.max(minH, Math.round(initChild.height * scaleY));
    }
    const fontScale = initChild.aspectRatioLocked ? uniformScale : Math.min(scaleX, scaleY);
    nextStyle = scaleStyleProps(initChild.style, fontScale);
    nextConfig = scaleConfigProps(initChild.config, fontScale);
    if (initChild.responsive) {
      nextResp = {
        ...initChild.responsive,
        ...(initChild.responsive.paddingOverride
          ? {
              paddingOverride: {
                ...(initChild.responsive.paddingOverride.tablet !== undefined
                  ? { tablet: scaleInt(initChild.responsive.paddingOverride.tablet, fontScale, 0) }
                  : {}),
                ...(initChild.responsive.paddingOverride.mobile !== undefined
                  ? { mobile: scaleInt(initChild.responsive.paddingOverride.mobile, fontScale, 0) }
                  : {}),
              },
            }
          : {}),
        ...(initChild.responsive.fontSizeOverride
          ? {
              fontSizeOverride: {
                ...(initChild.responsive.fontSizeOverride.tablet !== undefined
                  ? { tablet: scaleInt(initChild.responsive.fontSizeOverride.tablet, fontScale, 8) }
                  : {}),
                ...(initChild.responsive.fontSizeOverride.mobile !== undefined
                  ? { mobile: scaleInt(initChild.responsive.fontSizeOverride.mobile, fontScale, 8) }
                  : {}),
              },
            }
          : {}),
      };
    }
  } else if (scaleMode === "anchor") {
    const anchors = initChild.responsive?.anchors || { left: true, top: true };
    const rightMargin = initParent.width - (initChild.x + initChild.width);
    const bottomMargin = initParent.height - (initChild.y + initChild.height);

    if (anchors.left && anchors.right) {
      nextX = initChild.x;
      nextW = Math.max(minW, Math.round(nextParent.width - initChild.x - rightMargin));
    } else if (anchors.right && !anchors.left) {
      nextW = initChild.width;
      nextX = Math.round(nextParent.width - rightMargin - nextW);
    }

    if (anchors.top && anchors.bottom) {
      nextY = initChild.y;
      nextH = Math.max(minH, Math.round(nextParent.height - initChild.y - bottomMargin));
    } else if (anchors.bottom && !anchors.top) {
      nextH = initChild.height;
      nextY = Math.round(nextParent.height - bottomMargin - nextH);
    }
  }

  const candidate: BuilderNode = {
    ...initChild,
    x: nextX,
    y: nextY,
    width: nextW,
    height: nextH,
    style: nextStyle,
    config: nextConfig,
    responsive: nextResp,
  };
  const clamped = clampNodeToParent(candidate, nextParent);
  return { ...candidate, ...clamped };
}

/**
 * Predictable, zero-drift container resize relative to `initialNodes`.
 * Respects each child's own `responsive.scaleMode` ("fixed" | "anchor" | "proportional"),
 * supports multi-level nested containers, and guarantees every descendant stays inside its parent bounds.
 */
export function applyContainerResize(
  initialNodes: BuilderNode[],
  containerId: string,
  targetRect: { x: number; y: number; width: number; height: number },
  options?: { forceProportional?: boolean; lockCustomRpcChildren?: boolean }
): BuilderNode[] {
  const initParent = initialNodes.find((n) => n.id === containerId);
  if (!initParent || initParent.width <= 0 || initParent.height <= 0) {
    return initialNodes;
  }

  const forceProportional = Boolean(
    options?.forceProportional || initParent.config?.rpcContainerResizeMode === "proportional"
  );

  const initMap = new Map<string, BuilderNode>();
  initialNodes.forEach((n) => initMap.set(n.id, n));

  const nextMap = new Map<string, BuilderNode>(initMap);

  const outerParent = initParent.parentId ? nextMap.get(initParent.parentId) || null : null;
  let updatedContainer: BuilderNode = {
    ...initParent,
    x: Math.round(targetRect.x),
    y: Math.round(targetRect.y),
    width: Math.round(targetRect.width),
    height: Math.round(targetRect.height),
  };
  if (outerParent) {
    const clampedOuter = clampNodeToParent(updatedContainer, outerParent);
    updatedContainer = { ...updatedContainer, ...clampedOuter };
  }
  nextMap.set(containerId, updatedContainer);

  // Breadth-first traversal ensures nested child containers (Level 2) adapt cleanly when Level 1 or 2 resizes
  const queue: string[] = [containerId];
  const visited = new Set<string>([containerId]);

  while (queue.length > 0) {
    const curPid = queue.shift()!;
    const initP = initMap.get(curPid);
    const nextP = nextMap.get(curPid);
    if (!initP || !nextP) continue;

    for (const node of initialNodes) {
      if (node.parentId !== curPid) continue;
      const isLockedFreeRpc = Boolean(
        options?.lockCustomRpcChildren &&
          (node.type === "custom-rpc" || node.type === "custom-rpc-embed")
      );
      const resizedChild = isLockedFreeRpc
        ? { ...node, ...clampNodeToParent(node, nextP) }
        : resizeSingleChildFromSnapshot(
            node,
            initP,
            nextP,
            curPid === containerId ? forceProportional : false
          );
      nextMap.set(node.id, resizedChild);
      if (!isLockedFreeRpc && isContainerType(node.type) && !visited.has(node.id)) {
        visited.add(node.id);
        queue.push(node.id);
      }
    }
  }

  return initialNodes.map((n) => nextMap.get(n.id) || n);
}

/**
 * Backward-compatible alias for proportional corner resize callers.
 */
export function applyProportionalContainerCornerScale(
  initialNodes: BuilderNode[],
  containerId: string,
  targetRect: { x: number; y: number; width: number; height: number }
): BuilderNode[] {
  return applyContainerResize(initialNodes, containerId, targetRect, {
    forceProportional: true,
  });
}
