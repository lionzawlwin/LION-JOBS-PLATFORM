-- Layer 10: internal-hiring safety/hygiene for the repo owner's own F&B
-- brands (Cheesy Bites, Hey U, TTT, Yangon Burger). Additive, defaulted
-- false for every existing row -- no behavior change for any company
-- that isn't explicitly marked internal. See
-- docs/superpowers/specs/2026-07-06-layer10-internal-hiring-tier-design.md.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT false;
