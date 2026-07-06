import Link from "next/link";
import { LayoutDashboard, Palette, User, Link as LinkIcon, MousePointerClick, Gamepad2, LayoutTemplate } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
    { href: "/dashboard/customize", icon: Palette, label: "Customize" },
    { href: "/dashboard/bio", icon: User, label: "Biography" },
    { href: "/dashboard/socials", icon: LinkIcon, label: "Social Links" },
    { href: "/dashboard/buttons", icon: MousePointerClick, label: "Buttons" },
    { href: "/dashboard/rpc", icon: Gamepad2, label: "Rich Presence" },
    { href: "/dashboard/templates", icon: LayoutTemplate, label: "Templates" },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col hidden md:flex">
        <div className="p-6">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Dashboard
          </h2>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white"
            >
              <item.icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white">
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
