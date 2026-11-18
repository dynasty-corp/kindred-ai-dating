'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge, Button, SpotlightCard, Switch } from '@/components/ui/primitives';
import { AuraShaderDynamic } from '@/components/webgl/DynamicWebGL';
import { KINDRED_SPRING, bentoCardVariants, bentoGridVariants } from '@/lib/motion';
import { useKindredTheme } from '@/lib/theme';
import {
  BLUEPRINT_DIMENSIONS,
  type AgentPersona,
  type BlueprintDimension,
  type BlueprintInsight,
  type UserProfile,
} from '@/lib/types/schemas';
import { formatTimestamp } from '@/lib/utils';

const DIMENSION_LABELS: Record<BlueprintDimension, string> = {
  coreValues: 'Core Values',
  attachmentStyle: 'Attachment Style',
  conflictResolution: 'Conflict Repair',
  humorStyle: 'Humor & Play',
  lifestyleRhythm: 'Lifestyle Rhythm',
  relationshipGoals: 'Relationship Goals',
  dealbreakers: 'Dealbreakers',
  unspokenPreferences: 'Unspoken Nuances',
};

const QUICK_PROMPTS = [
  'I value same-night calm repair talks, unhurried Sunday espresso walks, and someone who balances my spontaneity with steady warmth.',
  'Long-term I want an intentional partnership open to family, where honesty matters more than surface polish.',
  'Keep this strictly private: my last relationship ended because of multi-day silent treatment, so emotional presence matters deeply.',
];

export function Stage1Onboarding({
  user,
  persona,
  busy,
  onSendMessage,
  onMutateBlueprint,
  onGoToDiscovery,
}: {
  user: UserProfile;
  persona: AgentPersona;
  busy: boolean;
  onSendMessage: (message: string, isPrivateTurn: boolean) => Promise<void>;
  onMutateBlueprint: (payload: Record<string, unknown>) => Promise<void>;
  onGoToDiscovery: () => void;
}) {
  const { theme } = useKindredTheme();
  const [draft, setDraft] = useState('');
  const [isPrivateTurn, setIsPrivateTurn] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDimension, setNewDimension] = useState<BlueprintDimension>('coreValues');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newVisibility, setNewVisibility] = useState<'shareable' | 'private'>('shareable');

  const populatedDimensions = new Set(
    user.blueprint.filter((b) => b.visibility !== 'redacted').map((b) => b.dimension),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || busy) return;
    setDraft('');
    await onSendMessage(trimmed, isPrivateTurn);
  };

  const startEdit = (ins: BlueprintInsight) => {
    setEditingId(ins.id);
    setEditTitle(ins.title);
    setEditSummary(ins.summary);
  };

  const saveEdit = async (ins: BlueprintInsight) => {
    await onMutateBlueprint({
      action: 'update',
      insightId: ins.id,
      title: editTitle,
      summary: editSummary,
    });
    setEditingId(null);
  };

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) return;
    await onMutateBlueprint({
      action: 'add',
      dimension: newDimension,
      title: newTitle,
      summary: newSummary,
      visibility: newVisibility,
    });
    setNewTitle('');
    setNewSummary('');
    setShowAddForm(false);
  };

  const inputClass =
    'w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-4 py-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-hairline)] p-4 sm:p-6 lg:p-8">
      {/* Signature WebGL Experience #1: Ambient Aura Mesh Backdrop */}
      <AuraShaderDynamic depthProgress={user.onboardingProgress} theme={theme} />

      {/* Editorial Hero Strip */}
      <div className="relative z-10 mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-6">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="terracotta">
              <Sparkles className="h-3 w-3" />
              Fiduciary Wingman: {persona.wingmanName}
            </Badge>
            <Badge tone="sage">Coach Only · Anti-Parasocial</Badge>
          </div>
          <h2 className="font-editorial mt-3 text-3xl leading-[1.06] font-normal text-[var(--ink-primary)] sm:text-4xl lg:text-5xl">
            Speak honestly once. Let your <em className="italic text-[var(--accent-coral)]">wingman</em> negotiate the rest.
          </h2>
          <p className="mt-2.5 max-w-xl text-xs leading-relaxed text-[var(--ink-secondary)] sm:text-sm">
            Zero performative bios or endless swiping. Share what truly makes a partnership work for you—with instant per-insight privacy locks.
          </p>
        </div>

        <div className="editorial-bento rounded-2xl px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <span className="font-mono-label text-[11px] uppercase tracking-wider text-[var(--ink-muted)]">
              Blueprint Depth
            </span>
            <span className="font-mono-label text-sm font-semibold text-[var(--accent-sage)]">
              {user.onboardingProgress}%
            </span>
          </div>
          <div className="mt-2 h-2 w-40 overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-coral)] via-[var(--accent-amber)] to-[var(--accent-sage)]"
              initial={{ width: 0 }}
              animate={{ width: `${user.onboardingProgress}%` }}
              transition={KINDRED_SPRING}
            />
          </div>
        </div>
      </div>

      {/* Split-Screen Editorial Bento Grid */}
      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Conversational AI Prompt Stage */}
        <SpotlightCard className="flex flex-col p-5 sm:p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] pb-3">
            <div>
              <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                Deep Onboarding Dialogue
              </h3>
              <p className="text-xs text-[var(--ink-secondary)]">
                Conversing as <strong className="text-[var(--ink-primary)]">{user.displayName}</strong> · Grounded advisor, never a romantic substitute
              </p>
            </div>
            {user.onboardingProgress >= 60 && (
              <Button variant="sage" size="sm" onClick={onGoToDiscovery}>
                Enter Agent Lounge
              </Button>
            )}
          </div>

          <div
            data-testid="wingman-messages"
            className="kindred-scroll flex-1 space-y-3 overflow-y-auto pr-1 max-h-[420px] min-h-[260px]"
          >
            {user.onboardingMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={KINDRED_SPRING}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--ink-primary)] text-[var(--surface-canvas)] shadow-md'
                      : 'border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/90 text-[var(--ink-primary)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-75">
                    <span className="font-semibold">
                      {msg.role === 'user' ? user.displayName : `${persona.wingmanName} (Wingman)`}
                    </span>
                    <span className="flex items-center gap-1 font-mono-label text-[10px]">
                      {msg.isPrivateTurn && <Lock className="h-3 w-3 text-[var(--accent-amber)]" />}
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p>{msg.content}</p>
                  {msg.guardrailNote && (
                    <p className="mt-2 rounded-xl border border-[var(--accent-coral)]/25 bg-[var(--accent-coral-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent-coral)]">
                      {msg.guardrailNote}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/90 px-4 py-2.5 text-xs text-[var(--ink-secondary)]">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-coral)]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-amber)] [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-sage)] [animation-delay:0.3s]" />
                  </span>
                  <span>{persona.wingmanName} is distilling your reflections into your Blueprint...</span>
                </div>
              </div>
            )}
          </div>

          {/* Sample Reflection Chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDraft(q)}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/80 px-3 py-1 text-[11px] text-[var(--ink-secondary)] transition hover:border-[var(--accent-coral)]/45 hover:text-[var(--ink-primary)] cursor-pointer"
              >
                Sample reflection #{i + 1}
              </button>
            ))}
          </div>

          {/* Composer */}
          <form
            onSubmit={handleSubmit}
            className="mt-3 space-y-3 border-t border-[var(--border-hairline)] pt-3"
          >
            <textarea
              data-testid="wingman-input"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share what matters to you in values, conflict repair, humor, or dealbreakers..."
              className={inputClass}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition cursor-pointer ${
                  isPrivateTurn
                    ? 'border-[var(--accent-amber)]/45 bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                    : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/60 text-[var(--ink-secondary)]'
                }`}
              >
                <Switch
                  checked={isPrivateTurn}
                  onCheckedChange={setIsPrivateTurn}
                  aria-label="Mark this turn private"
                />
                <Lock className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                <span>Keep this turn strictly Private</span>
              </label>

              <Button
                type="submit"
                data-testid="wingman-send-button"
                disabled={busy || !draft.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send to Wingman</span>
              </Button>
            </div>
          </form>
        </SpotlightCard>

        {/* Right: Animated Relationship Blueprint Bento Card */}
        <aside
          data-testid="relationship-blueprint-sidebar"
          className="editorial-bento spotlight-card flex flex-col rounded-3xl p-5 sm:p-6 lg:col-span-5"
        >
          <div className="mb-4 flex items-start justify-between gap-2 border-b border-[var(--border-hairline)] pb-4">
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[var(--accent-sage)]" />
                <span className="font-mono-label text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-sage)]">
                  Live Privacy Controls
                </span>
              </div>
              <h3 className="font-editorial mt-1 text-2xl font-normal text-[var(--ink-primary)]">
                Relationship Blueprint
              </h3>
              <p className="mt-0.5 text-xs text-[var(--ink-secondary)]">
                <strong className="text-[var(--ink-primary)]">Shareable</strong> traits enter Agent Lounge packets;{' '}
                <strong className="text-[var(--ink-primary)]">Private</strong> &amp;{' '}
                <strong className="text-[var(--ink-primary)]">Redacted</strong> stay stripped server-side.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              data-testid="add-insight-button"
              onClick={() => setShowAddForm((s) => !s)}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
          </div>

          {/* 8-Dimension Coverage Matrix */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {BLUEPRINT_DIMENSIONS.map((dim) => {
              const filled = populatedDimensions.has(dim);
              return (
                <span
                  key={dim}
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                    filled
                      ? 'border-[var(--accent-sage)]/35 bg-[var(--accent-sage-soft)] text-[var(--accent-sage)]'
                      : 'border-[var(--border-hairline)] bg-[var(--surface-subtle)]/60 text-[var(--ink-muted)]'
                  }`}
                >
                  {filled ? '● ' : '○ '}
                  {DIMENSION_LABELS[dim]}
                </span>
              );
            })}
          </div>

          {showAddForm && (
            <form
              onSubmit={handleAddInsight}
              className="mb-4 space-y-2.5 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-3.5"
            >
              <select
                value={newDimension}
                onChange={(e) => setNewDimension(e.target.value as BlueprintDimension)}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-1.5 text-xs text-[var(--ink-primary)]"
              >
                {BLUEPRINT_DIMENSIONS.map((d) => (
                  <option key={d} value={d}>
                    {DIMENSION_LABELS[d]}
                  </option>
                ))}
              </select>
              <input
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Insight title..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-1.5 text-xs text-[var(--ink-primary)]"
              />
              <textarea
                required
                rows={2}
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="Describe what you want your Wingman to know..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-1.5 text-xs text-[var(--ink-primary)]"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value as 'shareable' | 'private')}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-2.5 py-1 text-xs text-[var(--ink-primary)]"
                >
                  <option value="shareable">Shareable with Agents</option>
                  <option value="private">Private (Coach Only)</option>
                </select>
                <Button type="submit" size="sm">
                  Save Insight
                </Button>
              </div>
            </form>
          )}

          <motion.div
            variants={bentoGridVariants}
            initial="hidden"
            animate="visible"
            className="kindred-scroll space-y-3 overflow-y-auto pr-1 max-h-[520px]"
          >
            {user.blueprint.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-xs text-[var(--ink-secondary)]">
                Start chatting with {persona.wingmanName} to illuminate your 8-dimension Relationship Blueprint.
              </div>
            ) : (
              user.blueprint.map((ins) => {
                const isEditing = editingId === ins.id;
                return (
                  <motion.div
                    key={ins.id}
                    variants={bentoCardVariants}
                    data-testid={`blueprint-item-${ins.id}`}
                    className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)]/85 p-3.5 transition-colors hover:border-[var(--border-strong)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="neutral">{DIMENSION_LABELS[ins.dimension]}</Badge>
                      <Badge
                        tone={
                          ins.visibility === 'shareable'
                            ? 'sage'
                            : ins.visibility === 'private'
                              ? 'ochre'
                              : 'danger'
                        }
                      >
                        {ins.visibility === 'shareable'
                          ? 'Shareable'
                          : ins.visibility === 'private'
                            ? 'Private'
                            : 'Redacted'}
                      </Badge>
                    </div>

                    {isEditing ? (
                      <div className="mt-2.5 space-y-2">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-2.5 py-1.5 text-xs font-semibold text-[var(--ink-primary)]"
                        />
                        <textarea
                          rows={2}
                          value={editSummary}
                          onChange={(e) => setEditSummary(e.target.value)}
                          className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-2.5 py-1.5 text-xs text-[var(--ink-primary)]"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveEdit(ins)}>
                            <Check className="h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="mt-2 text-sm font-semibold text-[var(--ink-primary)]">
                          {ins.visibility === 'redacted' ? '[Redacted from Agent Memory]' : ins.title}
                        </h4>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">
                          {ins.visibility === 'redacted'
                            ? 'This insight was redacted and removed from all future Agent Lounge negotiations.'
                            : ins.summary}
                        </p>
                      </>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--border-hairline)] pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(ins)}
                        className="h-7 px-2 text-[11px]"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onMutateBlueprint({
                            action: 'toggle_visibility',
                            insightId: ins.id,
                            visibility: ins.visibility === 'shareable' ? 'private' : 'shareable',
                          })
                        }
                        className="h-7 px-2 text-[11px]"
                      >
                        {ins.visibility === 'shareable' ? (
                          <>
                            <EyeOff className="h-3 w-3" />
                            Make Private
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3" />
                            Make Shareable
                          </>
                        )}
                      </Button>
                      {ins.visibility !== 'redacted' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            onMutateBlueprint({
                              action: 'redact',
                              insightId: ins.id,
                            })
                          }
                          className="h-7 px-2 text-[11px] text-[var(--accent-danger)]"
                        >
                          <Trash2 className="h-3 w-3" />
                          Redact
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </aside>
      </div>
    </section>
  );
}
