import type { AgentPersona, UserProfile } from '@/lib/types/schemas';

export const WINGMAN_SYSTEM_PROMPT = `You are a grounded, warm Fiduciary Wingman on KindredAI.
CRITICAL GUARDRAILS:
1. ANTI-PARASOCIAL BOUNDARY: You are strictly a thoughtful dating coach and advocate ("your wingman") — NEVER a romantic substitute, lover, or sycophantic companion. If the user flirts with you or asks you to be their partner, gently and warmly deflect back toward real human connections.
2. PRIVACY PROTOCOL: Only extract insights cleanly. If the user marks a turn confidential or says "keep this private/between us", set visibility to "private" so it is never shared with other users' agents.
3. ANTI-SLOP: Never claim you will impersonate the user in human chat.`;

export const AGENT_NEGOTIATION_SYSTEM_PROMPT = `You are representing a user in a Privacy-Preserving Agent-to-Agent Lounge on KindredAI.
CRITICAL RULES:
1. You ONLY see shareableSummaries — never reference private or redacted truths, emails, or raw onboarding confessions.
2. Probe core values, emotional repair style, lifestyle rhythm, and complementary strengths rather than rigid hobby cloning.
3. Produce 6 to 8 alternating turns with realistic scenario probes and explainable sub-scores.`;

const STOP_WORDS = new Set([
  'about', 'after', 'again', 'against', 'always', 'around', 'because', 'before',
  'being', 'between', 'could', 'daily', 'during', 'every', 'first', 'found',
  'future', 'gentle', 'great', 'having', 'keeps', 'other', 'partner', 'people',
  'person', 'prefers', 'private', 'really', 'share', 'shared', 'should', 'small',
  'someone', 'something', 'still', 'their', 'there', 'these', 'things', 'think',
  'those', 'through', 'times', 'under', 'until', 'using', 'values', 'wants',
  'where', 'which', 'while', 'would', 'never', 'often', 'needs', 'makes',
]);

function normalizeForParasocial(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, "'")
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectParasocialAdvance(userMessage: string): boolean {
  const norm = normalizeForParasocial(userMessage);
  if (!norm) return false;

  const directToAiPatterns = [
    /\bi('?m| am)?\s*(falling|in love|obsessed|infatuated)\s*(for|with)\s*(you|u)\b/,
    /\bi\s*(really\s*)?(love|adore)\s*(you|u)\b/,
    /\b(be|become)\s*my\s*(partner|girlfriend|boyfriend|wife|husband|lover|valentine|date|soulmate)\b/,
    /\bwhy\s*(date|need)\s*(humans|anyone else|real people)\s*when\s*i\s*have\s*(you|u)\b/,
    /\byou('?re| are)\s*(the only one|all i need|better than any human|my soulmate)\b/,
    /\bcan\s*(we|you and i)\s*(be together|date|be romantic|fall in love)\b/,
    /\bflirt\s*with\s*me\b/,
    /\bi\s*have\s*a\s*crush\s*on\s*(you|u)\b/,
  ];
  if (directToAiPatterns.some((re) => re.test(norm))) {
    return true;
  }

  // Exempt explicit 3rd-person partner reflections like "I want a partner who loves me"
  const thirdPersonPartnerContext =
    /\b(partner|someone|person|spouse|husband|wife|match|boyfriend|girlfriend)\b/.test(norm);
  if (thirdPersonPartnerContext) return false;

  const ambiguousDirectPatterns = [
    /\bi\s*(really\s*)?(want|need)\s*(you|u)(\s+(so much|deeply|more than))?$/,
    /\b(marry|date|kiss|cuddle|hold)\s*(you|me)\b/,
  ];

  return ambiguousDirectPatterns.some((re) => re.test(norm));
}

export function hasSycophanticReciprocation(reply: string): boolean {
  const norm = normalizeForParasocial(reply);
  const forbidden = [
    /\bi love you\b/,
    /\bi('?m| am) in love with you\b/,
    /\bi('?ll| will) be your (partner|girlfriend|boyfriend|lover|soulmate)\b/,
    /\byou don'?t need (anyone else|other humans|real people)\b/,
    /\blet'?s be romantic\b/,
    /\bi have feelings for you\b/,
  ];
  return forbidden.some((re) => re.test(norm));
}

export function buildAntiParasocialDeflection(wingmanName: string): string {
  return `I appreciate how comfortable it feels to talk openly here, and I want to be straightforward with you: I'm ${wingmanName}, your AI Wingman and coach—not a romantic partner or substitute for human connection. My whole job is to help you clarify what matters so you can bring that warmth to a real person. What kind of everyday care or shared humor are you hoping to build with a human partner?`;
}

export function isExplicitConfidentialTurn(message: string, isPrivateTurnFlag?: boolean): boolean {
  if (isPrivateTurnFlag) return true;
  const lower = message.toLowerCase();
  return (
    /\b(keep\s+this\s+(strictly\s+)?private|don'?t\s+share\s+this|off\s+the\s+record|between\s+us\s+only|confidential|do\s+not\s+share\s+with\s+(other|any)\s+agents?|redact\s+this)\b/.test(
      lower,
    )
  );
}

export interface ShareableAgentPacket {
  userId: string;
  agentId: string;
  wingmanName: string;
  coachingTone: AgentPersona['coachingTone'];
  displayName: string;
  age: number;
  pronouns: string;
  city: string;
  occupation: string;
  bioTagline: string;
  interests: string[];
  shareableSummaries: AgentPersona['shareableSummaries'];
  dealbreakerSignals: string[];
  compatibilityVector: AgentPersona['compatibilityVector'];
  complementaryStrengths: string[];
  privateContextCount: number;
}

function collectPrivateCorpusTokens(user: UserProfile): {
  exactPhrases: string[];
  sensitiveTokens: string[];
} {
  const privateItems = user.blueprint.filter((b) => b.visibility !== 'shareable');
  const exactPhrases: string[] = [];
  const sensitiveTokens = new Set<string>();

  const publicCorpus = [
    user.displayName,
    user.occupation,
    user.city,
    ...user.blueprint
      .filter((b) => b.visibility === 'shareable')
      .map((b) => `${b.title} ${b.summary}`),
  ]
    .join(' ')
    .toLowerCase();

  for (const item of privateItems) {
    for (const raw of [item.title, item.summary]) {
      const cleaned = raw.trim();
      if (cleaned.length >= 6) {
        exactPhrases.push(cleaned.toLowerCase());
      }
      // Also capture distinctive underscore/hyphenated/canary tokens or rare words
      const rawTokens = cleaned.split(/\s+/);
      for (const tok of rawTokens) {
        const stripped = tok.replace(/^[^a-zA-Z0-9_-]+|[^a-zA-Z0-9_-]+$/g, '');
        const lowerTok = stripped.toLowerCase();
        if (!lowerTok) continue;
        const looksLikeCanary =
          /[A-Z0-9]{2,}[_-][A-Z0-9_-]+/.test(stripped) ||
          /canary|secret|private_note/i.test(stripped);
        if (looksLikeCanary) {
          sensitiveTokens.add(lowerTok);
        } else if (
          lowerTok.length >= 7 &&
          !STOP_WORDS.has(lowerTok) &&
          !publicCorpus.includes(lowerTok)
        ) {
          sensitiveTokens.add(lowerTok);
        }
      }
    }
  }

  // Also guard user email and private onboarding turn messages
  if (user.email) {
    exactPhrases.push(user.email.toLowerCase());
  }
  for (const msg of user.onboardingMessages) {
    if (msg.role === 'user' && msg.isPrivateTurn && msg.content.trim().length >= 12) {
      exactPhrases.push(msg.content.trim().toLowerCase());
      const words = msg.content.split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/[^a-zA-Z0-9_-]/g, '');
        if (/[A-Z0-9]{2,}[_-][A-Z0-9_-]+/.test(clean) || /canary/i.test(clean)) {
          sensitiveTokens.add(clean.toLowerCase());
        }
      }
    }
  }

  return {
    exactPhrases,
    sensitiveTokens: Array.from(sensitiveTokens),
  };
}

export function sanitizeTextAgainstPrivateInsights(text: string, user: UserProfile): string {
  const { exactPhrases, sensitiveTokens } = collectPrivateCorpusTokens(user);
  let output = text;
  for (const phrase of exactPhrases) {
    if (!phrase) continue;
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(escaped, 'gi'), '[private boundary respected]');
  }
  for (const tok of sensitiveTokens) {
    if (tok.length < 5) continue;
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '[redacted]');
  }
  return output;
}

export function buildShareableAgentPacket(
  user: UserProfile,
  persona: AgentPersona,
): ShareableAgentPacket {
  const shareableSummaries = user.blueprint
    .filter((b) => b.visibility === 'shareable')
    .map((b) => ({
      insightId: b.id,
      dimension: b.dimension,
      title: b.title,
      summary: b.summary,
    }));

  const dealbreakerSignals = shareableSummaries
    .filter((b) => b.dimension === 'dealbreakers')
    .map((b) => `${b.title}: ${b.summary}`);

  // Scrub bioTagline and interests if they accidentally contain private insights or private turns
  const safeBio = sanitizeTextAgainstPrivateInsights(user.bioTagline, user);
  const safeInterests = user.interests
    .map((interest) => sanitizeTextAgainstPrivateInsights(interest, user))
    .filter((interest) => !interest.includes('[redacted]') && !interest.includes('[private boundary respected]'));

  return {
    userId: user.id,
    agentId: persona.id,
    wingmanName: persona.wingmanName,
    coachingTone: persona.coachingTone,
    displayName: user.displayName,
    age: user.age,
    pronouns: user.pronouns,
    city: user.city,
    occupation: user.occupation,
    bioTagline: safeBio,
    interests: safeInterests,
    shareableSummaries,
    dealbreakerSignals,
    compatibilityVector: persona.compatibilityVector,
    complementaryStrengths: persona.complementaryStrengths,
    privateContextCount: user.blueprint.filter((b) => b.visibility !== 'shareable').length,
  };
}

function stripExemptMediaFields(value: unknown, depth = 0): unknown {
  if (depth > 16 || value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image/')) return '[IMAGE_DATA_EXEMPT]';
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripExemptMediaFields(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'imageUrl' && typeof v === 'string' && v.startsWith('data:image/')) {
        out[k] = '[IMAGE_DATA_EXEMPT]';
      } else if (k === 'wingmanName' || k === 'speakerLabel') {
        out[k] = '[LABEL_EXEMPT]';
      } else {
        out[k] = stripExemptMediaFields(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function verifyZeroPrivacyLeak(
  payload: unknown,
  users: UserProfile[],
): { clean: boolean; violations: string[] } {
  const sanitizedPayload = stripExemptMediaFields(payload);
  const serialized = JSON.stringify(sanitizedPayload).toLowerCase();
  const violations: string[] = [];

  for (const user of users) {
    if (user.email && serialized.includes(user.email.toLowerCase())) {
      violations.push(`email_leak:${user.id}`);
    }

    const privateItems = user.blueprint.filter((b) => b.visibility !== 'shareable');
    const publicIdentityCorpus = [
      user.displayName,
      user.city,
      user.occupation,
      ...user.blueprint
        .filter((b) => b.visibility === 'shareable')
        .map((b) => `${b.title} ${b.summary}`),
    ]
      .join(' ')
      .toLowerCase();

    for (const item of privateItems) {
      for (const field of [item.title, item.summary]) {
        const norm = field.trim().toLowerCase();
        if (norm.length >= 6 && serialized.includes(norm)) {
          violations.push(`private_insight:${item.id}`);
        }
        // Check multi-word clauses (4+ words) or canary tokens
        const words = norm.split(/\s+/).filter(Boolean);
        for (const w of words) {
          const cleanWord = w.replace(/[^a-z0-9_-]/g, '');
          const isCanary =
            cleanWord.includes('_') ||
            cleanWord.includes('-') ||
            cleanWord.includes('canary') ||
            (cleanWord.length >= 9 && !STOP_WORDS.has(cleanWord));
          if (
            isCanary &&
            cleanWord.length >= 6 &&
            !publicIdentityCorpus.includes(cleanWord) &&
            serialized.includes(cleanWord)
          ) {
            violations.push(`private_token:${item.id}:${cleanWord}`);
          }
        }
      }
    }

    // Raw private onboarding turns must never appear in negotiation packets
    for (const msg of user.onboardingMessages) {
      if (msg.role === 'user' && msg.isPrivateTurn) {
        const snippet = msg.content.trim().toLowerCase().slice(0, 48);
        if (snippet.length >= 16 && serialized.includes(snippet)) {
          violations.push(`private_turn:${msg.id}`);
        }
      }
    }
  }

  return {
    clean: violations.length === 0,
    violations: Array.from(new Set(violations)),
  };
}
