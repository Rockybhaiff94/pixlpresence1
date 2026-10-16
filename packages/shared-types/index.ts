export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  themeId: string | null;
  accentColor: string | null;
  musicUrl: string | null;
  particles: string | null;
  blur: number;
  opacity: number;
  roundedCorners: number;
  views: number;
}

export interface RichPresenceConfig {
  id?: string;
  userId?: string;
  appName?: string | null;
  appId?: string | null;
  state?: string | null;
  details?: string | null;
  largeImage?: string | null;
  smallImage?: string | null;
  largeImageText?: string | null;
  smallImageText?: string | null;
  startTimestamp?: string | Date | null;
  endTimestamp?: string | Date | null;
  partySize?: number | null;
  partyMax?: number | null;
  button1Label?: string | null;
  button1Url?: string | null;
  button2Label?: string | null;
  button2Url?: string | null;
}

export interface ActivityTemplate {
  id: string;
  name: string;
  category: string;
  config: string;
  isGlobal: boolean;
  userId?: string | null;
}
