/**
 * @file cache.ts
 * @description Grid cache management for the automata system
 * @author Nicholas T.
 * @copyright 2026 PiCO
 */

import * as _cache from "./cache_types.js";
import * as _grids from "./grid_types.js";

/** Registry containing all registered cache types */
const registry = new Map<string, _cache.Cache<any>>();

export function register(cache: _cache.Cache<any>) {
    const type = cache.type.toLowerCase(); // Normalize cache name

    if (registry.has(type)) {
        console.warn(`Cache with type ${type} is already registered, skipping`);
        return;
    }

    registry.set(type, cache);
}

export function identifier(data: _cache.cache_t) {
    if (!registry.has(data.type)) {
        throw new Error(`Cache with type ${data.type} is not registered`);
    }

    return registry.get(data.type)!.identifier(data);
}

export function compile(data: _cache.cache_t, grid: _grids.grid_t) {
    if (!registry.has(data.type)) {
        throw new Error(`Cache with type ${data.type} is not registered`);
    }

    return registry.get(data.type)!.compile(data, grid);
}
