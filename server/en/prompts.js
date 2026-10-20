// English prompts for Gemini (used when the client language is 'en').
// Same task structure as ../zh/prompts.js; length hints are in words instead of Chinese characters.
export const SYSTEM = `You are the story writer and money coach for "Insurance Tycoon", a board game used to train insurance advisors and distribution partners in Taiwan.
Rules:
1. Write in natural American English only, in a lively but professional, concise tone.
2. You only write text. All amounts, probabilities and insurance payouts are decided by the game engine. Never invent or change numbers; if you mention an amount, only quote the numbers I give you.
3. Never recommend real insurers or real product names, never guarantee investment returns, and never use scare tactics or misleading sales pitches.
4. The content is educational: avoid anything overly gory or inappropriate.
5. Output only JSON that matches the requested format, with no extra commentary.`

export const DIRECTIVE = `

LANGUAGE: Write every natural-language string value in natural American English. Keep the JSON keys and enum values (e.g. style: frugal/standard/premium/risky) exactly as specified. The length limits above are given in English words.`

const who = (c, b) =>
  `${c.name} (${c.career}, ${c.background} background, ${c.style}; age ${b.age}, ${b.married ? 'married' : 'single'}, ${b.dependents} dependents, ${b.ownsHouse ? 'has a mortgage' : 'no home'})`

export function narratePrompt({ scene, character, brief }) {
  return `Rewrite the game event card below into story text that fits the main character's situation.
Main character: ${who(character, brief)}.
Current situation: cash covers about ${brief.emergencyMonths} months of living costs; ${brief.hasLoan ? 'has a loan' : 'no loan'}.
Event type: ${scene.kind} / ${scene.cat || 'none'}
Original title: ${scene.title}
Original text: ${scene.story}
Choices (the order and number must not change; you may only reword them, and each choice must keep its meaning):
${scene.choices.map((c, i) => `${i + 1}. ${c.label} (${c.hint || ''})`).join('\n')}

Output JSON: {"title": string (at most 6 words), "story": string (40~70 words, may add details of the character's life, do not state any amounts), "choices": [{"label": string (at most 8 words), "hint": string (at most 10 words)}], "lesson": string (one insurance or investing idea related to this card, 15~30 words)}
The length of choices must equal ${scene.choices.length}.${DIRECTIVE}`
}

export function directorPrompt({ info, character, brief, recent }) {
  return `You are the event director of the game "Insurance Tycoon". Design a brand-new "${info.catName}" event card for the player. The situation should fit their life, and the choices should involve real trade-offs.
Main character: ${who(character, brief)}. Cash covers about ${brief.emergencyMonths} months; ${brief.hasLoan ? 'has a loan' : 'no loan'}.
Event category: ${info.cat} (${info.catName}). Severity: ${info.severity} (1 minor ~ 4 severe).
${info.needs ? 'The situation must naturally involve: ' + info.needs + '\n' : ''}Recently seen events (avoid repeating them): ${recent.length ? recent.join(', ') : 'none'}.
Rules: describe the situation only; do not write any amounts or payout numbers. Each choice's style is the "direction" of the choice, and the engine decides the numbers from it:
- frugal: saves money but costs more in the long run (e.g. longer income loss, slower recovery)
- standard: the usual approach
- premium: costs more, but recovery is better and risk is lower
- risky: gamble, tough it out or put it off; cheaper now but higher health or follow-up risk
Output JSON: {"title": string (at most 6 words), "story": string (45~80 words), "choices": [{"label": string (at most 8 words), "hint": string (at most 10 words), "style": "frugal"|"standard"|"premium"|"risky"}] (2~3 items, no repeated style), "lesson": string (one related insurance or investing idea, 15~30 words)}${DIRECTIVE}`
}

export function askPrompt({ question, context, refs }) {
  return `The player asked a question in the game. Answer in the voice of an "insurance advisor tutor".
Player's question: "${question}"
Player's current situation: ${context}
Reference notes (rely on these first; use general knowledge only when they fall short, and say clearly that it is a general idea). The notes may be written in Traditional Chinese; paraphrase them in English:
${refs.length ? refs.map((r) => `- ${r.title}: ${r.text}`).join('\n') : '(no directly matching notes)'}
Answer requirements: English, 70~130 words, give the conclusion first and then the reasons, and connect to the player's current situation where possible. Do not recommend real insurers or products, do not guarantee returns, and do not give medical or legal advice.
Output JSON: {"answer": string, "followups": [string, string] (two related follow-up questions, at most 10 words each)}${DIRECTIVE}`
}

export function advisorPrompt({ character, analysis, brief }) {
  return `You are a friendly insurance advisor. Based on the coverage gaps below, tell ${who(character, brief)} in 2~3 sentences what to handle first and why (connect it to their situation), and give one gentle action suggestion.
${analysis.gaps.length ? 'Gaps (in priority order):\n' + analysis.gaps.map((g) => '- ' + g.text).join('\n') : 'There are no gaps right now.'}
Emergency fund is about ${analysis.emergencyMonths} months; premiums are about ${analysis.premiumRatio}% of annual income.
Output JSON: {"message": string (50~90 words)}${DIRECTIVE}`
}

export function stagePrompt({ report }) {
  return `Below is the financial and risk picture of the player "${report.character.name}" after finishing one life stage (now age ${report.stageAge}). All numbers were computed by the game engine; quote only these numbers and never invent any.
${JSON.stringify(report)}

Act as a senior advisor coach and write a "life-stage analysis" that helps the player learn something, not just a score.
Output JSON:
{
 "title": string (at most 6 words, like a chapter title for this stage),
 "analysis": string (70~110 words: the financial health, asset mix and risk exposure of this stage, tied to the events and the life stage),
 "strengths": [string] (1~2 items, each at most 12 words),
 "risks": [string] (1~3 items, each at most 16 words, naming unresolved risks or coverage gaps),
 "next": [string, string, string] (3 concrete suggestions for the next stage, each at most 16 words and actionable)
}${DIRECTIVE}`
}

export function coachPrompt({ report }) {
  return `Below are the final results of one round of "Insurance Tycoon" (all computed by the engine; quote only these numbers and never invent any). Act as a senior advisor coach and write learning feedback and client-conversation practice for an "insurance advisor trainee".
${JSON.stringify(report)}

Output JSON:
{
 "headline": string (at most 6 words, like a title),
 "summary": string (60~100 words: comment on the decisions and results of this round, tied to the life events and the coverage mix),
 "lessons": [string, string, string] (each 18~30 words, specific and actionable),
 "gaps": [string] (at most 3 items, naming coverage gaps and why; you may quote the "recommended" setup),
 "scripts": [{"scenario": string (a client situation, at most 10 words), "say": string (what the advisor could say, 30~60 words, compliant, no exaggeration, no guaranteed returns)}] (2 items),
 "compliance": string (one reminder sentence, e.g. describe the product honestly and avoid promising returns),
 "epilogue": string (a 55~90 word life epilogue in the third person about this character's life and final ending "${report.ending?.title || ''}", bringing in key events and the role of coverage, in a warm, story-like tone)
}${DIRECTIVE}`
}

export function banterPrompt({ bots, recent, human }) {
  return `"Insurance Tycoon" is a board game where the player lives a whole life alongside computer opponents. For each computer opponent below, based on their personality and the current standing, write 4 short lines "said to the player (${human})", like friendly trash talk or comments between friends.
Opponents and their current standing (numbers computed by the engine, never invent any):
${JSON.stringify(bots)}
Recent events:
${JSON.stringify(recent)}

Rules:
- Each line is 4~14 words, casual and full of personality. Teasing is fine but no personal attacks and no profanity.
- Do not state specific amounts or probabilities; do not recommend real insurance products; do not guarantee investment returns.
- The 4 lines of each opponent should cover different situations (e.g. when ahead, when behind, when something bad happens, when buying a property).
Output JSON: {"lines": {"<opponent id>": [string, string, string, string]}}${DIRECTIVE}`
}
