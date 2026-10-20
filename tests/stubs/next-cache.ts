// Vitest runs route handlers outside Next, where 'use cache' is a no-op string and the cache
// APIs have no request store. These no-ops let the data layer run uncached in tests.
const noop = (..._args: unknown[]): void => void _args;

export const cacheLife = noop;
export const cacheTag = noop;
export const revalidateTag = noop;
export const updateTag = noop;
export const revalidatePath = noop;
export const refresh = noop;
