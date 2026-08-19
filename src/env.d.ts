/// <reference types="vite/client" />

declare module '*.vue' {
  import { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

/**
 * UTS 插件的类型声明。
 * .uts 源码由 uni 编译器处理，vue-tsc 无法解析，这里手写签名以保证类型检查通过。
 * 修改插件导出时必须同步这里。
 */
declare module '@/uni_modules/avalin-realtime-audio' {
  export function isAvailable(): boolean
  export function hasRecordPermission(): boolean
  /** @returns 空字符串表示成功，否则为错误码 */
  export function startCapture(sampleRate: number, frameBytes: number): string
  /** @returns Base64 编码的 PCM16；暂无数据时为空字符串 */
  export function readCaptureFrame(): string
  export function stopCapture(): void
  /** @returns 空字符串表示成功，否则为错误码 */
  export function startPlayback(sampleRate: number): string
  export function writePlayback(base64: string): number
  export function flushPending(): number
  export function hasPendingPlayback(): boolean
  export function clearPlayback(): void
  export function setPlaybackMuted(value: boolean): void
  export function stopPlayback(): void
}
