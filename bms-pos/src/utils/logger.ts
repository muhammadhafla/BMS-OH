/**
 * Simple Logger Utility
 * Replaces console statements with structured logging
 */

export class Logger {
  // Simplified logging without enum (to avoid unused variable warnings)
  static debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args)
  }

  static info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args)
  }

  static warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
  }

  static error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args)
  }

  // Sync-specific logging methods
  static syncStart(message: string, ...args: unknown[]): void {
    this.info(`🔄 ${message}`, ...args)
  }

  static syncSuccess(message: string, ...args: unknown[]): void {
    this.info(`✅ ${message}`, ...args)
  }

  static syncError(message: string, error?: unknown): void {
    if (error) {
      this.error(`❌ ${message}:`, error)
    } else {
      this.error(`❌ ${message}`)
    }
  }

  static syncWarning(message: string, ...args: unknown[]): void {
    this.warn(`⚠️ ${message}`, ...args)
  }
}