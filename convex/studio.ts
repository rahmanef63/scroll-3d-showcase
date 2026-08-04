import { v } from 'convex/values';
import { query } from './_generated/server';
import { studioTokenMatches } from './lib';

/**
 * Whether the host's studio token is the one this deployment will accept.
 *
 * Its own module because it is the only read the editor makes about itself
 * rather than about models or presets.
 *
 * The two copies of the token live in different places — the host's environment
 * and this deployment's — so nothing keeps them in step. When they drift the
 * editor still unlocks, because the cookie is compared against the host's copy,
 * and then every write is refused here. Asked at load, that is a sentence at the
 * top of the screen; found out on SAVE, it is a 500 after an hour of tuning.
 *
 * No new exposure: every mutation already answers the same question to anyone
 * who calls it with a guess, and the comparison is the same constant-time one.
 */
export const tokenAccepted = query({
  args: { token: v.string() },
  returns: v.boolean(),
  handler: (_ctx, args) => studioTokenMatches(args.token),
});
