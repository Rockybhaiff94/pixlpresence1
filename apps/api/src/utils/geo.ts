import geoip from 'geoip-lite';

export interface GeoLocationResult {
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  trafficSource: 'DIRECT' | 'DISCORD' | 'SEARCH' | 'SOCIAL' | 'EXTERNAL';
  referrer: string | null;
  device: 'Desktop' | 'Mobile' | 'Tablet';
  browser: string;
  os: string;
}

export const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  DE: 'Germany',
  CA: 'Canada',
  AU: 'Australia',
  FR: 'France',
  JP: 'Japan',
  BR: 'Brazil',
  NL: 'Netherlands',
  SG: 'Singapore',
  SE: 'Sweden',
  IT: 'Italy',
  ES: 'Spain',
  RU: 'Russia',
  KR: 'South Korea',
  CH: 'Switzerland',
  PL: 'Poland',
  ID: 'Indonesia',
  MX: 'Mexico',
  TR: 'Turkey',
  UA: 'Ukraine',
  VN: 'Vietnam',
  PH: 'Philippines',
  TH: 'Thailand',
  MY: 'Malaysia',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  ZA: 'South Africa',
  NZ: 'New Zealand',
  AT: 'Austria',
  BE: 'Belgium',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PT: 'Portugal',
  GR: 'Greece',
  CZ: 'Czech Republic',
  RO: 'Romania',
  HU: 'Hungary',
  IL: 'Israel',
  EG: 'Egypt',
  NG: 'Nigeria',
  PK: 'Pakistan',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
};

export const INDIA_STATE_NAMES: Record<string, string> = {
  MH: 'Maharashtra',
  JH: 'Jharkhand',
  DL: 'Delhi',
  KA: 'Karnataka',
  TN: 'Tamil Nadu',
  UP: 'Uttar Pradesh',
  WB: 'West Bengal',
  GJ: 'Gujarat',
  RJ: 'Rajasthan',
  KL: 'Kerala',
  TS: 'Telangana',
  TG: 'Telangana',
  AP: 'Andhra Pradesh',
  MP: 'Madhya Pradesh',
  BR: 'Bihar',
  HR: 'Haryana',
  PB: 'Punjab',
  OR: 'Odisha',
  OD: 'Odisha',
  AS: 'Assam',
  CT: 'Chhattisgarh',
  CG: 'Chhattisgarh',
  UT: 'Uttarakhand',
  UK: 'Uttarakhand',
  HP: 'Himachal Pradesh',
  JK: 'Jammu and Kashmir',
  GA: 'Goa',
  TR: 'Tripura',
  ML: 'Meghalaya',
  MN: 'Manipur',
  NL: 'Nagaland',
  MZ: 'Mizoram',
  AR: 'Arunachal Pradesh',
  SK: 'Sikkim',
  CH: 'Chandigarh',
  PY: 'Puducherry',
  LA: 'Ladakh',
  AN: 'Andaman and Nicobar Islands',
  LD: 'Lakshadweep',
  DH: 'Dadra and Nagar Haveli and Daman and Diu',
};

// Known coordinates for top cities across India
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Maharashtra
  mumbai: { lat: 19.076, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nagpur: { lat: 21.1458, lng: 79.0882 },
  nashik: { lat: 19.9975, lng: 73.7898 },
  thane: { lat: 19.2183, lng: 72.9781 },
  aurangabad: { lat: 19.8762, lng: 75.3433 },
  'chhatrapati sambhajinagar': { lat: 19.8762, lng: 75.3433 },
  kolhapur: { lat: 16.705, lng: 74.2433 },
  solapur: { lat: 17.6599, lng: 75.9064 },
  amravati: { lat: 20.9374, lng: 77.7796 },
  navi_mumbai: { lat: 19.033, lng: 73.0297 },

  // Jharkhand
  ranchi: { lat: 23.3441, lng: 85.3096 },
  jamshedpur: { lat: 22.8046, lng: 86.2029 },
  dhanbad: { lat: 23.7957, lng: 86.4304 },
  bokaro: { lat: 23.6693, lng: 86.1511 },
  deoghar: { lat: 24.4826, lng: 86.7001 },
  hazaribagh: { lat: 23.9961, lng: 85.3644 },
  giridih: { lat: 24.1852, lng: 86.3059 },
  ramgarh: { lat: 23.6338, lng: 85.518 },

  // Other India Tech Hubs & Capitals
  delhi: { lat: 28.6139, lng: 77.209 },
  'new delhi': { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  patna: { lat: 25.5941, lng: 85.1376 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  chandigarh: { lat: 30.7333, lng: 76.7794 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
  guwahati: { lat: 26.1445, lng: 91.7362 },
  bhubaneswar: { lat: 20.2961, lng: 85.8245 },
  raipur: { lat: 21.2514, lng: 81.6296 },

  // Global Metros
  'new york': { lat: 40.7128, lng: -74.006 },
  london: { lat: 51.5074, lng: -0.1278 },
  berlin: { lat: 52.52, lng: 13.405 },
  paris: { lat: 48.8566, lng: 2.3522 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  frankfurt: { lat: 50.1109, lng: 8.6821 },
  amsterdam: { lat: 52.3676, lng: 4.9041 },
};

export const COUNTRY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  IN: { lat: 20.5937, lng: 78.9629 },
  US: { lat: 37.0902, lng: -95.7129 },
  GB: { lat: 55.3781, lng: -3.436 },
  DE: { lat: 51.1657, lng: 10.4515 },
  CA: { lat: 56.1304, lng: -106.3468 },
  AU: { lat: -25.2744, lng: 133.7751 },
  FR: { lat: 46.2276, lng: 2.2137 },
  JP: { lat: 36.2048, lng: 138.2529 },
  BR: { lat: -14.235, lng: -51.9253 },
  NL: { lat: 52.1326, lng: 5.2913 },
  SG: { lat: 1.3521, lng: 103.8198 },
  SE: { lat: 60.1282, lng: 18.6435 },
  IT: { lat: 41.8719, lng: 12.5674 },
  ES: { lat: 40.4637, lng: -3.7492 },
  RU: { lat: 61.524, lng: 105.3188 },
  KR: { lat: 35.9078, lng: 127.7669 },
  CH: { lat: 46.8182, lng: 8.2275 },
  PL: { lat: 51.9194, lng: 19.1451 },
  MX: { lat: 23.6345, lng: -102.5528 },
  ID: { lat: -0.7893, lng: 113.9213 },
};

export function resolveTelemetry(req: any): GeoLocationResult {
  // 1. Extract IP
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp =
    (typeof forwarded === 'string' ? forwarded.split(',')[0] : null) ||
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    '127.0.0.1';

  const cleanIp = String(rawIp).trim().replace(/^::ffff:/, '');

  // 2. Proxy Header resolution (Vercel & Cloudflare)
  let countryCode: string | null =
    (req.headers['x-vercel-ip-country'] as string) ||
    (req.headers['cf-ipcountry'] as string) ||
    null;

  let region: string | null = (req.headers['x-vercel-ip-country-region'] as string) || null;
  let city: string | null = (req.headers['x-vercel-ip-city'] as string) || null;
  let latitude: number | null = req.headers['x-vercel-ip-latitude']
    ? parseFloat(req.headers['x-vercel-ip-latitude'] as string)
    : null;
  let longitude: number | null = req.headers['x-vercel-ip-longitude']
    ? parseFloat(req.headers['x-vercel-ip-longitude'] as string)
    : null;

  // 3. Fallback to geoip-lite if proxy headers unavailable or local testing
  if ((!countryCode || countryCode === 'XX') && cleanIp && cleanIp !== '127.0.0.1' && cleanIp !== '::1') {
    try {
      const geo = geoip.lookup(cleanIp);
      if (geo) {
        countryCode = geo.country || countryCode;
        region = geo.region || region;
        city = geo.city || city;
        if (geo.ll && Array.isArray(geo.ll)) {
          latitude = geo.ll[0];
          longitude = geo.ll[1];
        }
      }
    } catch (_) {}
  }

  // Fallback for local development if localhost
  if (!countryCode || countryCode === 'XX' || cleanIp === '127.0.0.1' || cleanIp === '::1') {
    // Provide sensible default for development: India anchor
    countryCode = 'IN';
    region = region || 'Maharashtra';
    city = city || 'Mumbai';
    latitude = latitude || 19.076;
    longitude = longitude || 72.8777;
  }

  // Normalize country name
  const upperCode = countryCode.toUpperCase();
  const countryName = COUNTRY_NAMES[upperCode] || upperCode;

  // Normalize Region / State for India
  if (upperCode === 'IN' && region) {
    const stateLookup = INDIA_STATE_NAMES[region.toUpperCase()];
    if (stateLookup) {
      region = stateLookup;
    }
  }

  // Coordinate refinement from known city catalog if lat/lng missing
  if ((latitude == null || longitude == null) && city) {
    const cityKey = city.toLowerCase().trim();
    if (CITY_COORDINATES[cityKey]) {
      latitude = CITY_COORDINATES[cityKey].lat;
      longitude = CITY_COORDINATES[cityKey].lng;
    }
  }

  // Coordinate fallback to country centroid
  if (latitude == null || longitude == null) {
    const centroid = COUNTRY_CENTROIDS[upperCode];
    if (centroid) {
      latitude = centroid.lat;
      longitude = centroid.lng;
    }
  }

  // 4. Device & User Agent Classification
  const ua = String(req.headers['user-agent'] || '');
  let device: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    device = 'Tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) {
    device = 'Mobile';
  }

  let browser = 'Unknown Browser';
  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';
  else if (/discord/i.test(ua)) browser = 'Discord In-App';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  // 5. Traffic Source & Referrer Classification
  const refHeader = String(req.headers['referer'] || req.headers['referrer'] || '').trim();
  let trafficSource: 'DIRECT' | 'DISCORD' | 'SEARCH' | 'SOCIAL' | 'EXTERNAL' = 'DIRECT';
  let referrer: string | null = null;

  if (refHeader && refHeader.length > 0) {
    referrer = refHeader.slice(0, 500);
    const lowerRef = refHeader.toLowerCase();

    if (lowerRef.includes('discord.com') || lowerRef.includes('discordapp.com')) {
      trafficSource = 'DISCORD';
    } else if (
      lowerRef.includes('google.') ||
      lowerRef.includes('bing.com') ||
      lowerRef.includes('duckduckgo.com') ||
      lowerRef.includes('ecosia.org') ||
      lowerRef.includes('yandex.')
    ) {
      trafficSource = 'SEARCH';
    } else if (
      lowerRef.includes('twitter.com') ||
      lowerRef.includes('x.com') ||
      lowerRef.includes('t.co') ||
      lowerRef.includes('instagram.com') ||
      lowerRef.includes('reddit.com') ||
      lowerRef.includes('tiktok.com') ||
      lowerRef.includes('youtube.com') ||
      lowerRef.includes('linkedin.com') ||
      lowerRef.includes('facebook.com') ||
      lowerRef.includes('threads.net') ||
      lowerRef.includes('t.me')
    ) {
      trafficSource = 'SOCIAL';
    } else if (
      lowerRef.includes('pixel.gg') ||
      lowerRef.includes('pixlpresence1') ||
      lowerRef.includes('localhost')
    ) {
      trafficSource = 'DIRECT';
    } else {
      trafficSource = 'EXTERNAL';
    }
  }

  return {
    countryCode: upperCode,
    countryName,
    region,
    city,
    latitude,
    longitude,
    trafficSource,
    referrer,
    device,
    browser,
    os,
  };
}

