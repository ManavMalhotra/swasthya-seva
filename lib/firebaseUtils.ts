/**
 * Firebase Utilities
 * 
 * Firebase Realtime Database does NOT accept undefined values.
 * These utilities ensure data is properly formatted before saving.
 */

/**
 * Recursively removes all properties with undefined values from an object.
 * Firebase Realtime Database throws an error if you try to set undefined values.
 * 
 * @param obj - Object to clean
 * @returns A new object with no undefined values
 */
export function cleanForFirebase<T extends Record<string, any>>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item =>
            typeof item === 'object' && item !== null
                ? cleanForFirebase(item)
                : item
        ) as unknown as T;
    }

    if (typeof obj !== 'object') {
        return obj;
    }

    const cleaned: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Skip undefined values entirely
        if (value === undefined) {
            continue;
        }

        // Recursively clean nested objects
        if (typeof value === 'object' && value !== null) {
            cleaned[key] = cleanForFirebase(value);
        } else {
            cleaned[key] = value;
        }
    }

    return cleaned as T;
}

/**
 * Validates that an object has no undefined values (for debugging).
 * Throws an error with the path to the undefined value.
 */
export function validateNoUndefined(obj: any, path = ''): void {
    if (obj === undefined) {
        throw new Error(`Undefined value at path: ${path || 'root'}`);
    }

    if (obj === null || typeof obj !== 'object') {
        return;
    }

    if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
            validateNoUndefined(item, `${path}[${index}]`);
        });
        return;
    }

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        if (value === undefined) {
            throw new Error(`Undefined value at path: ${currentPath}`);
        }
        if (typeof value === 'object' && value !== null) {
            validateNoUndefined(value, currentPath);
        }
    }
}
