import isoJson from "./isoData.json";

export type GeoLevel = "world" | "country" | "state" | "city";

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
  country?: string;
  countryCode?: string;
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
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const upper = countryCode.toUpperCase();
  try {
    return String.fromCodePoint(...upper.split("").map((c) => 127397 + c.charCodeAt(0)));
  } catch {
    return "🌐";
  }
}

export const ISO_NUMERIC_TO_A2: Record<string, string> = isoJson.numToA2;
export const COUNTRY_A2_TO_NAME: Record<string, string> = isoJson.a2ToName;
