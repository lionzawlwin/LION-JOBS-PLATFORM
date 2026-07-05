# Candidate tools (evaluated, not adopted)

External tools/repos surfaced 2026-07-06 for possible future use. None are installed, wired up, or pre-approved for autonomous use — this is a reference list only. Each one still needs its own relevance check and explicit go-ahead before anything gets installed or run, same as any other third-party tool evaluated for this project (see CLAUDE.md's "Known but deliberately not installed" section for the existing precedent).

None of these fit this project's current domain (Next.js/Supabase job board). Existence and descriptions below were verified against the GitHub API on 2026-07-06.

## Finance / trading agents
Real-money risk if ever connected to live accounts — always confirm before any execution, regardless of this list's existence.

- **AutoHedge** — github.com/The-Swarm-Corporation/AutoHedge — multi-agent autonomous hedge fund (research → validation → risk → execution).
- **Vibe-Trading** — github.com/HKUDS/Vibe-Trading — 64 finance skills, agents debate before trading crypto/stocks/options.
- **Fincept Terminal** — github.com/Fincept-Corporation/FinceptTerminal — Bloomberg Terminal-style app, 20+ investor-styled agents, 100+ data sources.

## Scraping / browser automation
- **Camofox Browser** — github.com/jo-inc/camofox-browser — stealth headless browser, explicitly markets bypassing Cloudflare/bot-detection/anti-scraping. Legitimate for testing your own site's defenses; needs a specific, named target and clear intent before any use against third-party sites.

## Ads / marketing audit
- **claude-ads** — github.com/AgriciDaniel/claude-ads — 250+ check paid-ads audit skill for Claude Code (Google/Meta/YouTube/LinkedIn/TikTok/Microsoft/Apple Ads).

## Video / image generation
- **Open-Generative-AI ("Open Higgsfield AI")** — github.com/Anil-matcha/Open-Generative-AI — self-hosted studio, 200+ models (Flux, Midjourney, Kling, Sora, Veo), no content filters.
- **Hyperframes** — github.com/heygen-com/hyperframes — renders HTML to MP4 video, built for agent use.
- **Presenton** — github.com/presenton/presenton — open-source AI presentation generator/API.

## Chat / companion / email agents
- **LibreChat** — librechat.ai — self-hosted unified chat UI across model providers.
- **Open-LLM-VTuber** — github.com/Open-LLM-VTuber/Open-LLM-VTuber — offline voice + Live2D desktop AI companion.
- **Agentic Inbox** — github.com/cloudflare/agentic-inbox — self-hosted AI email client on Cloudflare Workers.

## Reference / no install
- **free-llm-api-resources** — github.com/cheahjs/free-llm-api-resources — curated list of free LLM inference API tiers.

## When to revisit
If a future task on this project genuinely calls for one of these (e.g. an ads-audit feature needing `claude-ads`, or a video-from-HTML need matching `hyperframes`), evaluate that specific tool on its own merits at that time — check it's still maintained, read its actual code/install steps, and confirm with the user — rather than treating this list as standing pre-approval.
