# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The currently approved product plan identifies personal daily use, friends trying the experience, and offline project demonstrations as the near-term contexts. Whether café customers become a primary audience is undecided and is outside this UI pass.

## Product Purpose

星象塔罗 is a browser-based reflection tool. A user writes a question, chooses tarot, a traditional casting method, or both, and receives a reading they can inspect and revisit. Success means getting to a relevant, understandable first response quickly, while keeping the underlying cards or divination structure available for people who want more detail.

## Positioning

The product combines a visual tarot draw with deterministic 梅花易数 casting and optional AI explanation. The AI interprets the recorded cards or cast; it does not determine or alter them. Traditional material is presented as cultural reference and self-reflection, not as a factual claim or guaranteed prediction.

## Operating Context

- A single-page web app used on Android phones first, with desktop and tablet support.
- The primary flow is question → choose 起卦 / 塔罗牌 / 二合一 → begin → read a short explanation.
- Users may continue asking about the same result, inspect detailed analysis and source material, save history locally, and share a generated poster.
- Personal records are stored in the current browser. AI is optional and uses a server-side proxy; the UI must continue to work when the AI service is unavailable.
- The current plan treats café integration and commercial account/payment workflows as future exploration, not current product requirements.

## Capabilities and Constraints

- The current implementation uses native HTML, CSS, and JavaScript with local Three.js and card assets; there is no build step.
- Preserve existing tarot draw, hand/touch/mouse interaction, three-/five-card spreads, deterministic casting, explicit three-number precedence, result history, follow-up, sharing, and PWA behavior.
- Tarot, 起卦, and combined modes are distinct. Do not show tarot-only material when no cards were drawn, or hexagram-only material when no cast was made.
- Do not change calculations, AI endpoints/prompts, rate limits, secrets, server behavior, stored history format, or deployment in a UI redesign unless separately requested.
- Camera video remains hidden and the camera must not start automatically; optional hand gestures remain available.
- Prioritize a brief, direct answer and progressive disclosure of terminology and traditional source material. Keep the professional hexagram/card structure available in a clearly separate area.

## Brand Commitments

- Product name: 星象塔罗.
- The Chinese interface should be concise and plain-spoken; minimize unnecessary English, jargon, and repetitive AI-sounding copy.
- The user has rejected a strongly cyber look. Keep the experience calm and considered; do not make decoration or occult symbolism compete with the question and result.
- Keep tarot, divination, and traditional-cultural references clearly distinguished rather than implying that different systems are the same method.

## Evidence on Hand

- Current app and assets: `tarot.html`, `emil-redesign.css`, `settings-trial.css`, `assets/cards/`, `scripts/`, and `vendor/`.
- Existing project documentation: `README.md` and the user-approved `docs/轻量化体验改进计划书-v1.md`.
- The application currently exposes three reading modes, advanced settings, a scrollable result, optional AI explanation, and locally stored records. Exact edge-case behavior must be verified against the source and tests before changing it.
- No verified user study, accuracy benchmark, commercial customer, payment integration, or café order-validation integration is on hand. Do not invent or imply any of these.

## Product Principles

1. Get from a question to a first useful response with as few required choices as possible.
2. Put the direct, readable interpretation before optional technical detail.
3. Keep the recorded cards and deterministic cast authoritative; explanation never changes them.
4. Distinguish a cultural interpretation from verified facts, professional advice, or certainty about another person.
5. Keep core use and personal records available without AI or an account.
