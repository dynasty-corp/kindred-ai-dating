'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Lock,
  Pencil,
  Plus,
  Send,
  ShieldCheck,
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
  attachmentStyle: 'Attachment',
  conflictResolution: 'Conflict Repair',
  humorStyle: 'Humor & Play',
  lifestyleRhythm: 'Rhythm',
  relationshipGoals: 'Goals',
  dealbreakers: 'Dealbreakers',
  unspokenPreferences: 'Nuances',
};

const QUICK_PROMPTS = [
  'I value calm same-night repair talks, slow Sunday coffee walks, and warm humor.',
  'I am looking for an intentional long-term partnership built on honesty and curiosity.',
  'Keep this strictly private: past silent treatment made emotional presence essential for me.',
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
    'w-full rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-4 py-3 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/35';

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border-hairline)] p-5 sm:p-7 lg:p-8">
      {/* Bright Sunlit Aura Mesh Backdrop */}
      <AuraShaderDynamic depthProgress={user.onboardingProgress} theme={theme} />

      {/* Slim Motivating Blueprint Completeness Meter & Effortless Controls */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[var(--border-hairline)] bg-[var(--surface-glass)] px-5 py-4 backdrop-blur-xl">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-label text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-coral)]">
              Wingman · {persona.wingmanName}
            </span>
            <span className="font-mono-label text-[11px] font-semibold text-[var(--accent-sage)]">
              {user.onboardingProgress}% Blueprint Complete
            </span>
          </div>
          <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[var(--surface-subtle)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent-coral)] via-[var(--accent-amber)] to-[var(--accent-sage)]"
              initial={{ width: 0 }}
              animate={{ width: `${user.onboardingProgress}%` }}
              transition={KINDRED_SPRING}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              onSendMessage(
                'Ask me something else — maybe about my weekend rhythm, humor, or how I like to travel.',
                false,
              )
            }
            className="rounded-full"
          >
            Skip / Ask Me Something Else
          </Button>
          <Button
            variant="sage"
            size="sm"
            onClick={onGoToDiscovery}
            className="rounded-full px-4"
          >
            <span>Ready to Match Now</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Calm Split-Screen: Conversation + Relationship Blueprint */}
      <div className="relative z-10 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Conversational Stage */}
        <SpotlightCard className="flex flex-col p-5 sm:p-6 lg:col-span-7">
          <div
            data-testid="wingman-messages"
            className="kindred-scroll flex-1 space-y-3.5 overflow-y-auto pr-1 max-h-[430px] min-h-[280px]"
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
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent-coral)] text-white shadow-xs'
                      : 'border border-[var(--border-hairline)] bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-80">
                    <span className="font-semibold">
                      {msg.role === 'user' ? user.displayName : persona.wingmanName}
                    </span>
                    <span className="flex items-center gap-1 font-mono-label text-[10px]">
                      {msg.isPrivateTurn && <Lock className="h-3 w-3" />}
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  <p>{msg.content}</p>
                  {msg.guardrailNote && (
                    <p className="mt-2 rounded-xl bg-[var(--accent-amber-soft)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent-amber)]">
                      {msg.guardrailNote}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)] px-4 py-2.5 text-xs text-[var(--ink-secondary)]">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-coral)]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-amber)] [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-sage)] [animation-delay:0.3s]" />
                  </span>
                  <span>{persona.wingmanName} is updating your Blueprint...</span>
                </div>
              </div>
            )}
          </div>

          {/* Gentle Starter Ideas */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDraft(q)}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/80 px-3 py-1 text-[11px] text-[var(--ink-secondary)] transition hover:border-[var(--accent-coral)]/40 hover:text-[var(--ink-primary)] cursor-pointer"
              >
                Idea #{i + 1}
              </button>
            ))}
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <textarea
              data-testid="wingman-input"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Share what makes a relationship feel right for you..."
              className={inputClass}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--ink-secondary)] cursor-pointer">
                <Switch
                  checked={isPrivateTurn}
                  onCheckedChange={setIsPrivateTurn}
                  aria-label="Mark this turn private"
                />
                <Lock className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                <span>Keep private</span>
              </label>

              <Button
                type="submit"
                data-testid="wingman-send-button"
                disabled={busy || !draft.trim()}
                className="rounded-full px-5"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </Button>
            </div>
          </form>
        </SpotlightCard>

        {/* Right: Streamlined Relationship Blueprint */}
        <aside
          data-testid="relationship-blueprint-sidebar"
          className="editorial-bento spotlight-card flex flex-col rounded-3xl p-5 sm:p-6 lg:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-editorial text-2xl font-normal text-[var(--ink-primary)]">
                Relationship Blueprint
              </h3>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--ink-secondary)]">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-sage)]" />
                <span>Click any badge to switch Private vs. Shareable</span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              data-testid="add-insight-button"
              onClick={() => setShowAddForm((s) => !s)}
              className="rounded-full"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add</span>
            </Button>
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
                placeholder="Trait or value title..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-1.5 text-xs text-[var(--ink-primary)]"
              />
              <textarea
                required
                rows={2}
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="What should your wingman remember?"
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-1.5 text-xs text-[var(--ink-primary)]"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value as 'shareable' | 'private')}
                  className="rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-2.5 py-1 text-xs text-[var(--ink-primary)]"
                >
                  <option value="shareable">Shareable</option>
                  <option value="private">Private</option>
                </select>
                <Button type="submit" size="sm" className="rounded-full">
                  Save
                </Button>
              </div>
            </form>
          )}

          <motion.div
            variants={bentoGridVariants}
            initial="hidden"
            animate="visible"
            className="kindred-scroll space-y-2.5 overflow-y-auto pr-1 max-h-[480px]"
          >
            {user.blueprint.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-xs text-[var(--ink-secondary)]">
                Chat with {persona.wingmanName} to gently build your personal Blueprint.
              </div>
            ) : (
              user.blueprint.map((ins) => {
                const isEditing = editingId === ins.id;
                return (
                  <motion.div
                    key={ins.id}
                    variants={bentoCardVariants}
                    data-testid={`blueprint-item-${ins.id}`}
                    className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-elevated)] p-3.5 transition hover:border-[var(--border-strong)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-[var(--ink-muted)]">
                        {DIMENSION_LABELS[ins.dimension]}
                      </span>
                      <div className="flex items-center gap-1">
                        {ins.visibility !== 'redacted' ? (
                          <button
                            type="button"
                            onClick={() =>
                              onMutateBlueprint({
                                action: 'toggle_visibility',
                                insightId: ins.id,
                                visibility: ins.visibility === 'shareable' ? 'private' : 'shareable',
                              })
                            }
                            title="Toggle Shareable vs. Private"
                            className="cursor-pointer"
                          >
                            <Badge tone={ins.visibility === 'shareable' ? 'sage' : 'ochre'}>
                              {ins.visibility === 'shareable'
                                ? 'Shareable Signal'
                                : 'Private to My AI'}
                            </Badge>
                          </button>
                        ) : (
                          <Badge tone="danger">Redacted</Badge>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(ins)}
                          aria-label="Edit insight"
                          className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--ink-primary)] cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        {ins.visibility !== 'redacted' && (
                          <button
                            type="button"
                            onClick={() =>
                              onMutateBlueprint({
                                action: 'redact',
                                insightId: ins.id,
                              })
                            }
                            aria-label="Redact insight"
                            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--accent-danger-soft)] hover:text-[var(--accent-danger)] cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
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
                        <h4 className="mt-1.5 text-sm font-semibold text-[var(--ink-primary)]">
                          {ins.visibility === 'redacted' ? '[Redacted]' : ins.title}
                        </h4>
                        <p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-secondary)]">
                          {ins.visibility === 'redacted'
                            ? 'Removed from all future Agent Lounge conversations.'
                            : ins.summary}
                        </p>
                      </>
                    )}
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
