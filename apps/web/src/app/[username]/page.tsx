import { notFound } from 'next/navigation';
import { ViewTracker } from '@/components/effects/ViewTracker';
import { ParticlesCanvas } from '@/components/effects/ParticlesCanvas';

async function getProfile(username: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/profile/u/${username}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    return null;
  }
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const data = await getProfile(params.username);
  
  if (!data || !data.profile) {
    notFound();
  }

  const { user, profile } = data;

  const accentColor = profile.accentColor || '#8b5cf6';
  const blurStyle = profile.blur > 0 ? { backdropFilter: `blur(${profile.blur}px)` } : {};

  return (
    <main className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" style={{ backgroundColor: '#09090b' }}>
      <ViewTracker username={params.username} />
      
      {/* Dynamic Background Gradient */}
      <div 
        className="absolute inset-0 opacity-20 z-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accentColor}, transparent 70%)`
        }}
      />
      
      {/* Particles Engine */}
      <ParticlesCanvas type={profile.particles || 'None'} color={accentColor} />

      {/* Main Glassmorphism Card */}
      <div 
        className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col items-center p-8 transition-all"
        style={{
          backgroundColor: `rgba(24, 24, 27, ${profile.opacity / 100 || 0.8})`,
          ...blurStyle,
          borderRadius: `${profile.roundedCorners || 20}px`
        }}
      >
        {/* Avatar */}
        <div 
          className="w-28 h-28 rounded-full bg-zinc-800 p-1 mb-6 shadow-xl relative"
          style={{ backgroundImage: `linear-gradient(to bottom right, ${accentColor}, transparent)` }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900 border-2 border-zinc-900">
            {profile.avatarUrl || user.avatar ? (
              <img 
                src={profile.avatarUrl || `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`} 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-500">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Discord Status Indicator */}
          <div className="absolute bottom-1 right-1 w-6 h-6 bg-zinc-900 rounded-full flex items-center justify-center">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          </div>
        </div>

        {/* Name and Bio */}
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {profile.displayName || user.username}
        </h1>
        {profile.bio && (
          <p className="text-zinc-400 text-center text-sm leading-relaxed mb-6 max-w-sm">
            {profile.bio}
          </p>
        )}

        {/* Action Buttons */}
        {profile.buttons && profile.buttons.length > 0 && (
          <div className="w-full space-y-3 mb-6">
            {profile.buttons.sort((a: any, b: any) => a.order - b.order).map((btn: any) => (
              <a
                key={btn.id}
                href={btn.url}
                target={btn.openInNewTab ? "_blank" : "_self"}
                rel="noreferrer"
                className="block w-full text-center py-3 px-4 rounded-xl font-medium text-white transition-all transform hover:scale-[1.02] active:scale-95"
                style={{
                  backgroundColor: btn.gradient ? undefined : (accentColor + '80'),
                  background: btn.gradient ? btn.gradient : undefined,
                  border: `1px solid ${accentColor}40`
                }}
              >
                {btn.title}
                {btn.subtitle && <span className="block text-xs opacity-70 mt-0.5">{btn.subtitle}</span>}
              </a>
            ))}
          </div>
        )}

        {/* Social Links Row */}
        {profile.links && profile.links.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {profile.links.filter((l:any) => l.visibility).sort((a: any, b: any) => a.order - b.order).map((link: any) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                title={link.label}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <span className="text-sm">🔗</span>
              </a>
            ))}
          </div>
        )}

        {/* Footer Brand */}
        <div className="mt-8 pt-4 border-t border-white/10 w-full text-center">
          <p className="text-xs text-zinc-600 font-medium">powered by discord rpc platform</p>
        </div>
      </div>
    </main>
  );
}
