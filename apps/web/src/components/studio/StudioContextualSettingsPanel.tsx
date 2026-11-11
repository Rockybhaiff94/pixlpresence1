"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DockPosition } from "./StudioFloatingDock";

interface StudioContextualSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dockPosition: DockPosition;
  children: React.ReactNode;
}

export const StudioContextualSettingsPanel: React.FC<StudioContextualSettingsPanelProps> = ({
  isOpen,
  onClose,
  dockPosition,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Determine slide animation variants based on dock position
  const getMotionVariants = () => {
    switch (dockPosition) {
      case "bottom":
        return {
          initial: { opacity: 0, y: 35, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 25, scale: 0.97 },
        };
      case "top":
        return {
          initial: { opacity: 0, y: -35, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -25, scale: 0.97 },
        };
      case "left":
        return {
          initial: { opacity: 0, x: -35, scale: 0.97 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -25, scale: 0.97 },
        };
      case "right":
        return {
          initial: { opacity: 0, x: 35, scale: 0.97 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 25, scale: 0.97 },
        };
      case "float":
      default:
        return {
          initial: { opacity: 0, y: 25, scale: 0.97 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 15, scale: 0.97 },
        };
    }
  };

  // Determine container placement classes
  const getPlacementClasses = () => {
    switch (dockPosition) {
      case "bottom":
        return "bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2";
      case "top":
        return "top-18 sm:top-20 left-1/2 -translate-x-1/2";
      case "left":
        return "left-18 sm:left-24 top-1/2 -translate-y-1/2";
      case "right":
        return "right-18 sm:right-24 top-1/2 -translate-y-1/2";
      case "float":
      default:
        return "bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2";
    }
  };

  const variants = getMotionVariants();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          initial={variants.initial}
          animate={variants.animate}
          exit={variants.exit}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className={`absolute z-30 ${getPlacementClasses()} w-[94vw] sm:w-[540px] md:w-[580px] max-w-[620px] max-h-[76vh] bg-[#0c0c0e]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col font-mono`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

