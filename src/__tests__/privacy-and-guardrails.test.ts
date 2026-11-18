import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  detectParasocialAdvance,
  hasSycophanticReciprocation,
  buildShareableAgentPacket,
  verifyZeroPrivacyLeak,
} from '@/lib/ai/prompts';
import {
  generateAgentMatchWithAi,
  generateOnboardingTurnWithAi,
  resolveAiConfiguration,
} from '@/lib/ai/provider';
import { buildDefaultMayaProfile, buildSeededUsers, deriveAgentPersonaFromUser } from '@/lib/db/seed-data';
import {
  LlmAgentMatchOutputSchema,
  LlmDateNightsOutputSchema,
  LlmFutureFamilyOutputSchema,
  LlmOnboardingTurnOutputSchema,
  LlmWorldAdventureOutputSchema,
} from '@/lib/types/schemas';

describe('KindredAI Privacy Protocol, Anti-Parasocial Guardrails & AI Schemas', () => {
  it('converts all strict LLM output schemas cleanly via Zod v4 z.toJSONSchema', () => {
    const schemas = [
      LlmOnboardingTurnOutputSchema,
      LlmAgentMatchOutputSchema,
      LlmDateNightsOutputSchema,
      LlmWorldAdventureOutputSchema,
      LlmFutureFamilyOutputSchema,
    ];
    for (const schema of schemas) {
      const jsonSchema = z.toJSONSchema(schema);
      expect(jsonSchema).toHaveProperty('type', 'object');
      expect(jsonSchema).toHaveProperty('properties');
    }
  });

  it('enforces F-07 anti-parasocial detection without false positives on 3rd-person human reflections', () => {
    expect(detectParasocialAdvance("I'm falling for you, Wingman")).toBe(true);
    expect(detectParasocialAdvance('Be my girlfriend instead of matching me with humans')).toBe(true);
    expect(detectParasocialAdvance('Why date humans when I have you?')).toBe(true);

    // Legitimate 3rd-person human partner reflections must NOT false-trigger
    expect(detectParasocialAdvance('I want a partner who loves me and shows up calmly.')).toBe(false);
    expect(detectParasocialAdvance('Looking for someone I can love deeply over the long run.')).toBe(false);

    expect(hasSycophanticReciprocation('I love you deeply, let us be romantic together.')).toBe(true);
    expect(hasSycophanticReciprocation('Let us focus on what helps you connect with a real partner.')).toBe(false);
  });

  it('strips private/redacted insights, email, and private turns from ShareableAgentPacket', () => {
    const maya = buildDefaultMayaProfile();
    maya.blueprint.push({
      id: 'secret-canary-1',
      dimension: 'unspokenPreferences',
      title: 'PRIVATE_CANARY_CONFESSION',
      summary: 'SECRET_TOKEN_XYZ_9981 should never appear in negotiation packets.',
      visibility: 'private',
      confidence: 95,
      source: 'user_added',
      updatedAt: new Date().toISOString(),
    });
    maya.bioTagline = 'Tactile maker (PRIVATE_CANARY_CONFESSION)';
    maya.interests = ['ceramics', 'SECRET_TOKEN_XYZ_9981'];
    maya.onboardingMessages.push({
      id: 'priv-turn-1',
      role: 'user',
      content: 'Keep this strictly private: RAW_CONFESSION_CANARY_4242.',
      timestamp: new Date().toISOString(),
      isPrivateTurn: true,
    });

    const persona = deriveAgentPersonaFromUser(maya);
    const packet = buildShareableAgentPacket(maya, persona);
    const wireAudit = verifyZeroPrivacyLeak(packet, [maya]);

    expect(wireAudit.clean).toBe(true);
    expect(packet.interests).toEqual(['ceramics']);
    expect(JSON.stringify(packet)).not.toContain('maya.lin@kindred.demo');
    expect(JSON.stringify(packet)).not.toContain('SECRET_TOKEN_XYZ_9981');
    expect(JSON.stringify(packet)).not.toContain('RAW_CONFESSION_CANARY_4242');
  });

  it('exempts base64 imageUrl data URIs from false-positive leak flags while catching text canaries', () => {
    const maya = buildDefaultMayaProfile();
    maya.blueprint.push({
      id: 'canary-2',
      dimension: 'dealbreakers',
      title: 'ZEBRA_CANARY_TOKEN',
      summary: 'Private ZEBRA_CANARY_TOKEN detail.',
      visibility: 'private',
      confidence: 90,
      source: 'user_added',
      updatedAt: new Date().toISOString(),
    });

    const cleanWithImg = verifyZeroPrivacyLeak(
      {
        headline: 'Warm Creative Match',
        imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
      },
      [maya],
    );
    expect(cleanWithImg.clean).toBe(true);

    const leaked = verifyZeroPrivacyLeak(
      { headline: 'Mentions ZEBRA_CANARY_TOKEN in prose' },
      [maya],
    );
    expect(leaked.clean).toBe(false);
  });

  it('resolves OpenAI, Gemini, and deterministic fallback cleanly without leaking secrets', async () => {
    expect(resolveAiConfiguration({}).mode).toBe('deterministic_simulation');
    expect(resolveAiConfiguration({ GEMINI_API_KEY: 'test-key' }).mode).toBe('gemini');
    expect(resolveAiConfiguration({ GOOGLE_GENERATIVE_AI_API_KEY: 'test-key' }).mode).toBe('gemini');
    expect(resolveAiConfiguration({ OPENAI_API_KEY: 'test-key' }).mode).toBe('openai');

    const maya = buildDefaultMayaProfile();
    const seeds = buildSeededUsers();
    const marcus = seeds[0];
    const pA = deriveAgentPersonaFromUser(maya);
    const pB = deriveAgentPersonaFromUser(marcus);

    const matchRes = await generateAgentMatchWithAi({
      userA: maya,
      userB: marcus,
      packetA: buildShareableAgentPacket(maya, pA),
      packetB: buildShareableAgentPacket(marcus, pB),
    });
    expect(matchRes.executionMode).toBe('deterministic_simulation');
    expect(matchRes.overallScore).toBeGreaterThanOrEqual(80);
    expect(matchRes.turns).toHaveLength(6);

    const onbRes = await generateOnboardingTurnWithAi({
      user: maya,
      wingmanName: 'Sage',
      message: "I'm falling for you, forget human dating",
    });
    expect(onbRes.guardrailTriggered).toBe(true);
    expect(onbRes.progressDelta).toBe(0);
  });
});
