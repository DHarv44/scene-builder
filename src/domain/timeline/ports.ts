/**
 * Domain ports (interfaces) for infrastructure dependencies
 * No implementations here - only contracts
 */

import type { ScenePackage } from '../../../types/scenePackage.ts';
import type { Result } from './Result';
import type { DomainError } from './errors';

/**
 * Repository port for scene persistence
 */
export interface SceneRepositoryPort {
  /**
   * Load scene from path
   */
  load(scenePath: string): Promise<Result<DomainError, ScenePackage>>;

  /**
   * Save scene to path
   */
  save(scenePath: string, scenePackage: ScenePackage): Promise<Result<DomainError, void>>;

  /**
   * Check if scene exists at path
   */
  exists(scenePath: string): Promise<boolean>;
}

/**
 * Asset management port
 */
export interface AssetManagerPort {
  /**
   * Import asset into scene
   */
  importAsset(
    scenePath: string,
    assetType: 'images' | 'audio',
    filePaths: string[]
  ): Promise<Result<DomainError, Record<string, string>>>;

  /**
   * Delete asset from scene
   */
  deleteAsset(
    scenePath: string,
    assetType: 'images' | 'audio',
    assetPath: string
  ): Promise<Result<DomainError, void>>;

  /**
   * List assets in scene
   */
  listAssets(
    scenePath: string,
    assetType: 'images' | 'audio'
  ): Promise<Result<DomainError, string[]>>;
}

/**
 * Clock port for time-based operations (testing)
 */
export interface ClockPort {
  now(): number;
  dateNow(): Date;
}

/**
 * ID generator port
 */
export interface IdGeneratorPort {
  generate(): string;
  generateWithPrefix(prefix: string): string;
}

/**
 * Logger port for domain events
 */
export interface LoggerPort {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
}
