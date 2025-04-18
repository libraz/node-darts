import * as fs from 'fs';
import * as path from 'path';
import { FileNotFoundError } from './errors';

/**
 * Checks if a file exists
 * @param filePath file path
 * @returns true if the file exists, false otherwise
 */
export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Validates a file path
 * @param filePath file path
 * @throws {FileNotFoundError} if the file is not found
 */
export function validateFilePath(filePath: string): void {
  if (!fileExists(filePath)) {
    throw new FileNotFoundError(filePath);
  }
}

/**
 * Creates a directory if it doesn't exist
 * @param dirPath directory path
 */
export function ensureDirectoryExists(dirPath: string): void {
  const dirname = path.dirname(dirPath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

/**
 * Sorts an array of strings
 * @param arr array to sort
 * @returns a new sorted array
 */
export function sortStrings(arr: string[]): string[] {
  return [...arr].sort((a, b) => a.localeCompare(b));
}

/**
 * Removes duplicates from an array
 * @param arr array to remove duplicates from
 * @returns a new array with duplicates removed
 */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Sorts an array of strings and removes duplicates
 * @param arr array to process
 * @returns a new sorted array with duplicates removed
 */
export function sortAndUniqueStrings(arr: string[]): string[] {
  return uniqueArray(sortStrings(arr));
}
