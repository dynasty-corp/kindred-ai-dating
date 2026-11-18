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
  Trash2,
} from 'lucide-react';
import { Badge, Button, Switch } from '@/components/ui/primitives';
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Wingman Conversation Panel */}
      <section className="editorial-card flex flex-col rounded-3xl p-5 sm:p-6 lg:col-span-7">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[#E4DDD2] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="terracotta">Fiduciary Wingman: {persona.wingmanName}</Badge>
              <Badge tone="sage">Coach Only · Anti-Parasocial</Badge>
            </div>
            <h2 className="font-editorial mt-2 text-2xl font-semibold text-[#15181C]">
              Deep Onboarding Conversation
            </h2>
            <p className="mt-1 text-xs text-[#535963]">
              Your wingman learns your values, conflict repair style, and dealbreakers — never acting as a romantic substitute.
            </p>
          </div>
          <div className="text-right">
            <span className="font-mono-label text-xs font-semibold text-[#15181C]">
              {user.onboardingProgress}% Blueprint Depth
            </span>
            <div className="mt-1.5 h-2 w-36 overflow-hidden rounded-full bg-[#E4DDD2]">
              <div
                className="h-full rounded-full bg-[#6E8F78] transition-all duration-500"
                style={{ width: `${user.onboardingProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div
          data-testid="wingman-messages"
          className="flex-1 space-y-3 overflow-y-auto pr-1 max-h-[420px] min-h-[260px]"
        >
          {user.onboardingMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#15181C] text-[#FAF7F2]'
                    : 'border border-[#E4DDD2] bg-[#FAF7F2] text-[#15181C]'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3 text-[11px] opacity-75">
                  <span className="font-semibold">
                    {msg.role === 'user' ? user.displayName : `${persona.wingmanName} (Wingman)`}
                  </span>
                  <span className="flex items-center gap-1">
                    {msg.isPrivateTurn && <Lock className="h-3 w-3 text-[#C89B54]" />}
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
                <p>{msg.content}</p>
                {msg.guardrailNote && (
                  <p className="mt-2 rounded-lg bg-[#D96B4F]/12 px-2.5 py-1 text-[11px] font-medium text-[#B85137]">
                    {msg.guardrailNote}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[#E4DDD2] bg-[#FAF7F2] px-4 py-2.5 text-xs text-[#535963]">
                {persona.wingmanName} is distilling your reflections into your Blueprint...
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setDraft(q)}
              className="rounded-full border border-[#E4DDD2] bg-[#FAF7F2] px-2.5 py-1 text-[11px] text-[#535963] hover:bg-[#F2ECE3] hover:text-[#15181C] cursor-pointer"
            >
              Sample reflection #{i + 1}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-2.5 border-t border-[#E4DDD2] pt-3">
          <textarea
            data-testid="wingman-input"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share what matters to you in values, conflict repair, humor, or dealbreakers..."
            className="w-full rounded-2xl border border-[#DFD7CA] bg-white px-4 py-3 text-sm text-[#15181C] focus:outline-none focus:ring-2 focus:ring-[#D96B4F]/40"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-[#535963] cursor-pointer">
              <Switch
                checked={isPrivateTurn}
                onCheckedChange={setIsPrivateTurn}
                aria-label="Mark this turn private"
              />
              <Lock className="h-3.5 w-3.5 text-[#C89B54]" />
              <span>Keep this turn strictly Private (never shared with other agents)</span>
            </label>
            <div className="flex items-center gap-2">
              {user.onboardingProgress >= 60 && (
                <Button variant="sage" size="sm" onClick={onGoToDiscovery}>
                  Enter Agent Lounge
                </Button>
              )}
              <Button
                type="submit"
                data-testid="wingman-send-button"
                disabled={busy || !draft.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send to Wingman</span>
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* Live Relationship Blueprint Sidebar */}
      <aside
        data-testid="relationship-blueprint-sidebar"
        className="editorial-card flex flex-col rounded-3xl p-5 sm:p-6 lg:col-span-5"
      >
        <div className="mb-4 flex items-start justify-between gap-2 border-b border-[#E4DDD2] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#6E8F78]" />
              <span className="font-mono-label text-[11px] font-semibold uppercase tracking-wider text-[#42614C]">
                Live Privacy Controls
              </span>
            </div>
            <h3 className="font-editorial mt-1 text-xl font-semibold text-[#15181C]">
              Relationship Blueprint
            </h3>
            <p className="mt-0.5 text-xs text-[#535963]">
              Only <strong className="text-[#15181C]">Shareable</strong> items enter Agent Lounge packets.{' '}
              <strong className="text-[#15181C]">Private</strong> &amp;{' '}
              <strong className="text-[#15181C]">Redacted</strong> items are stripped server-side.
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

        {showAddForm && (
          <form
            onSubmit={handleAddInsight}
            className="mb-4 space-y-2.5 rounded-2xl border border-[#DFD7CA] bg-[#FAF7F2] p-3.5"
          >
            <select
              value={newDimension}
              onChange={(e) => setNewDimension(e.target.value as BlueprintDimension)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-1.5 text-xs"
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
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-1.5 text-xs"
            />
            <textarea
              required
              rows={2}
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Describe what you want your Wingman to know..."
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-1.5 text-xs"
            />
            <div className="flex items-center justify-between">
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as 'shareable' | 'private')}
                className="rounded-xl border border-[#DFD7CA] bg-white px-2.5 py-1 text-xs"
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

        <div className="space-y-3 overflow-y-auto pr-1 max-h-[540px]">
          {user.blueprint.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DFD7CA] p-6 text-center text-xs text-[#535963]">
              Start chatting with {persona.wingmanName} to populate your 8-dimension Relationship Blueprint.
            </div>
          ) : (
            user.blueprint.map((ins) => {
              const isEditing = editingId === ins.id;
              return (
                <div
                  key={ins.id}
                  data-testid={`blueprint-item-${ins.id}`}
                  className="rounded-2xl border border-[#E4DDD2] bg-white p-3.5 shadow-2xs"
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
                        className="w-full rounded-lg border border-[#DFD7CA] px-2.5 py-1 text-xs font-semibold"
                      />
                      <textarea
                        rows={2}
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="w-full rounded-lg border border-[#DFD7CA] px-2.5 py-1 text-xs"
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
                      <h4 className="mt-2 text-sm font-semibold text-[#15181C]">
                        {ins.visibility === 'redacted' ? '[Redacted from Agent Memory]' : ins.title}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-[#535963]">
                        {ins.visibility === 'redacted'
                          ? 'This insight was redacted and removed from all future Agent Lounge negotiations.'
                          : ins.summary}
                      </p>
                    </>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#F2ECE3] pt-2">
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
                        className="h-7 px-2 text-[11px] text-[#9B3B2E]"
                      >
                        <Trash2 className="h-3 w-3" />
                        Redact
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
