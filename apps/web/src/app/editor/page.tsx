import { Metadata } from "next";
import { DesignEditor } from "@/components/editor/DesignEditor";

export const metadata: Metadata = {
  title: "Pixel Design Studio — Graphic & Banner Editor",
  description: "Create custom Discord banners, profile artwork, badges, and graphics with Pixel.gg's Nothing OS-styled design studio.",
};

export default function EditorPage() {
  return <DesignEditor />;
}
