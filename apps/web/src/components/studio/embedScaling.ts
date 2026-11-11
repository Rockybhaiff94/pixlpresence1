import { CanvasElement, CanvasTransform, EmbedScalingMode } from "@/types/studio";

/**
 * Rescales child elements when the parent embed container is resized.
 * Supports Proportional, Adaptive, and Hybrid (default) modes.
 */
export function scaleEmbedChildren(
  children: CanvasElement[],
  prevTransform: CanvasTransform,
  nextTransform: CanvasTransform,
  mode: EmbedScalingMode = "hybrid"
): CanvasElement[] {
  if (children.length === 0) return [];
  if (prevTransform.width <= 0 || prevTransform.height <= 0) return children;

  const scaleRatioX = nextTransform.width / prevTransform.width;
  const scaleRatioY = nextTransform.height / prevTransform.height;

  // If no dimension change, return original
  if (Math.abs(scaleRatioX - 1) < 0.001 && Math.abs(scaleRatioY - 1) < 0.001) {
    return children;
  }

  return children.map((child) => {
    // If the child is position/size locked, do not alter
    if (child.isLocked || child.transform.lockType === "full") {
      return child;
    }

    const t = child.transform;
    let newWidth = t.width;
    let newHeight = t.height;
    let newX = t.x;
    let newY = t.y;

    switch (mode) {
      case "proportional": {
        // Uniform or axis-based proportional scaling
        if (t.lockType !== "size") {
          newWidth = Math.max(20, Math.round(t.width * scaleRatioX));
          newHeight = Math.max(16, Math.round(t.height * scaleRatioY));
        }
        if (t.lockType !== "position") {
          newX = Math.round(t.x * scaleRatioX);
          newY = Math.round(t.y * scaleRatioY);
        }
        break;
      }

      case "adaptive": {
        // Keep component dimensions relatively stable, adapt position and clamp to bounds
        const maxAllowedW = Math.max(30, nextTransform.width - 24);
        if (t.lockType !== "size" && newWidth > maxAllowedW) {
          newWidth = maxAllowedW;
        }

        if (t.lockType !== "position") {
          // Adjust X proportionally, but clamp so it does not spill outside
          newX = Math.round(t.x * scaleRatioX);
          if (newX + newWidth > nextTransform.width - 12) {
            newX = Math.max(0, nextTransform.width - 12 - newWidth);
          }
          newY = Math.round(t.y * scaleRatioY);
        }
        break;
      }

      case "hybrid":
      default: {
        // Hybrid: Scales proportionally if container is large, clamps & protects readability if shrinking
        const isShrinking = scaleRatioX < 1 || scaleRatioY < 1;

        if (t.lockType !== "size") {
          // Allow text and avatar to scale moderately without becoming unreadable
          const moderateRatioX = 1 + (scaleRatioX - 1) * 0.75;
          const moderateRatioY = 1 + (scaleRatioY - 1) * 0.75;

          newWidth = Math.max(24, Math.round(t.width * moderateRatioX));
          newHeight = Math.max(18, Math.round(t.height * moderateRatioY));

          // Max container bounds clamping
          const maxAllowedW = Math.max(30, nextTransform.width - 24);
          if (newWidth > maxAllowedW) {
            newWidth = maxAllowedW;
          }
        }

        if (t.lockType !== "position") {
          newX = Math.round(t.x * scaleRatioX);
          newY = Math.round(t.y * scaleRatioY);

          // If shrinking causes right-edge overflow, gently shift inward
          if (isShrinking && newX + newWidth > nextTransform.width - 12) {
            newX = Math.max(0, nextTransform.width - 12 - newWidth);
          }
        }
        break;
      }
    }

    return {
      ...child,
      transform: {
        ...t,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
      },
    };
  });
}

