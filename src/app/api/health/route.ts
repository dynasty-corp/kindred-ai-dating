import { NextResponse } from 'next/server';
import { resolveAiConfiguration } from '@/lib/ai/provider';
import { getStorageDiagnostics, resolveEffectiveStorageMode } from '@/lib/db/repository';

export async function GET() {
  const ai = resolveAiConfiguration();
  const storageMode = await resolveEffectiveStorageMode();
  const diag = getStorageDiagnostics();

  return NextResponse.json({
    ok: true,
    service: 'kindred-ai-dating',
    aiMode: ai.mode,
    modelName: ai.modelName,
    storageMode,
    seededCount: diag.seededCount,
    timestamp: new Date().toISOString(),
  });
}
