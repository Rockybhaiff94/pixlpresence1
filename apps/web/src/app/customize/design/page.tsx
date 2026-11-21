import { Metadata } from "next";
import { DesignEditor } from "@/components/editor/DesignEditor";

export const metadata: Metadata = {
  title: "Design Studio — Pixel Customization",
  description: "Create custom graphics and banners directly inside your Pixel profile customization workspace.",
};

export default function CustomizeDesignPage() {
  return <DesignEditor />;
}
