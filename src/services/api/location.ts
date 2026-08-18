import { request } from '@/services/request'
import type { WeatherPeriod } from '@/services/api/diary'

export interface LocationContext {
  locationVisible: boolean
  weatherVisible: boolean
  address: string
  detailedAddress: string
  poi: string
  aoi: string
  street: string
  streetNumber: string
  province: string
  city: string
  district: string
  township: string
  adcode: string
  lat: number | null
  lng: number | null
  weather: string
  temperature: string
  weatherText: string
  weatherPeriods?: WeatherPeriod[]
  reportTime: string
  reverseGeocodeLimited: boolean
  ipLocationLimited?: boolean
  weatherLimited: boolean
  source?: 'gps' | 'ip'
}

export async function getLocationContext(lat: number, lng: number): Promise<LocationContext> {
  return request<LocationContext>({
    url: `/location/context?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
    method: 'GET',
    timeout: 10000,
  })
}

export async function getIpLocationContext(): Promise<LocationContext> {
  return request<LocationContext>({
    url: '/location/ip-context',
    method: 'GET',
    timeout: 10000,
  })
}
