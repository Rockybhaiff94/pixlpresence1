export type GeoLevel = 'world' | 'country' | 'state' | 'city';

export interface CountryMetric {
  code: string;
  name: string;
  views: number;
  uniqueVisitors: number;
  percentage: number;
  lat: number;
  lng: number;
}

export interface StateMetric {
  name: string;
  code?: string;
  views: number;
  uniqueVisitors: number;
  percentage: number;
  lat: number;
  lng: number;
}

export interface CityMetric {
  name: string;
  state: string;
  views: number;
  uniqueVisitors: number;
  percentage: number;
  lat: number;
  lng: number;
}

export interface TrafficRoute {
  id: string;
  origin: { name: string; lat: number; lng: number; country?: string };
  destination: { name: string; lat: number; lng: number; country?: string };
  volume: number;
  active: boolean;
}

export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const upper = countryCode.toUpperCase();
  return String.fromCodePoint(...upper.split('').map((c) => 127397 + c.charCodeAt(0)));
}

export const ISO_NUMERIC_TO_A2: Record<string, string> = {
  '356': 'IN',
  '840': 'US',
  '826': 'GB',
  '276': 'DE',
  '250': 'FR',
  '124': 'CA',
  '036': 'AU',
  '36': 'AU',
  '392': 'JP',
  '076': 'BR',
  '76': 'BR',
  '528': 'NL',
  '702': 'SG',
  '752': 'SE',
  '380': 'IT',
  '724': 'ES',
  '643': 'RU',
  '410': 'KR',
  '756': 'CH',
  '616': 'PL',
  '484': 'MX',
  '360': 'ID',
  '792': 'TR',
  '804': 'UA',
  '704': 'VN',
  '608': 'PH',
  '764': 'TH',
  '458': 'MY',
  '784': 'AE',
  '682': 'SA',
  '710': 'ZA',
  '554': 'NZ',
  '040': 'AT',
  '40': 'AT',
  '056': 'BE',
  '56': 'BE',
  '578': 'NO',
  '208': 'DK',
  '246': 'FI',
  '372': 'IE',
  '620': 'PT',
  '300': 'GR',
  '203': 'CZ',
  '642': 'RO',
  '348': 'HU',
  '376': 'IL',
  '818': 'EG',
  '566': 'NG',
  '586': 'PK',
  '050': 'BD',
  '50': 'BD',
  '144': 'LK',
  '524': 'NP',
  '032': 'AR',
  '32': 'AR',
  '152': 'CL',
  '170': 'CO',
  '604': 'PE',
  '156': 'CN',
};

export const COUNTRY_A2_TO_NAME: Record<string, string> = {
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
  MX: 'Mexico',
  ID: 'Indonesia',
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
  CN: 'China',
};

