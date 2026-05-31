'use client';

import type { Dispatch, SetStateAction } from 'react';
import { api, type MemberRow } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationStatus,
  ConversationTag,
  Tag,
} from '@/lib/types';

interface MutationsCtx {
  activeId: string | null;
  conversations: ConversationListItem[];
  members: MemberRow[];
  setConversations: Dispatch<SetStateAction<ConversationListItem[]>>;
  setThreads: Dispatch<SetStateAction<Record<string, ConversationDetail>>>;
  setTags: Dispatch<SetStateAction<Tag[]>>;
}

/**
 * The inbox's optimistic mutation handlers — take-over / hand-back, assign,
 * tag add/remove/create, and send reply. Each one updates local state
 * immediately and rolls back on API failure (or surfaces a retry toast).
 *
 * Pure factory: takes the data hook's state + setters, returns handlers.
 */
export function useInboxMutations(ctx: MutationsCtx) {
  const toast = useToast();
  const { activeId, conversations, members, setConversations, setThreads, setTags } = ctx;

  const setStatus = (id: string, status: ConversationStatus) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setThreads((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], status } } : prev));
  };

  const takeOver = async () => {
    if (!activeId) return;
    setStatus(activeId, 'human');
    try {
      await api.takeOver(activeId);
      toast.pushUndo("You're now handling — undo?", async () => {
        setStatus(activeId, 'bot');
        try {
          await api.handBack(activeId);
        } catch {
          /* silent */
        }
      });
    } catch {
      setStatus(activeId, 'bot');
      toast('error', "Couldn't take over — check the backend connection.");
    }
  };

  const handBack = async () => {
    if (!activeId) return;
    setStatus(activeId, 'bot');
    try {
      await api.handBack(activeId);
      toast.pushUndo('Handed back to the AI — undo?', async () => {
        setStatus(activeId, 'human');
        try {
          await api.takeOver(activeId);
        } catch {
          /* silent */
        }
      });
    } catch {
      setStatus(activeId, 'human');
      toast('error', "Couldn't hand back — check the backend connection.");
    }
  };

  const assign = async (assigneeUserId: string | null) => {
    if (!activeId) return;
    const id = activeId;
    const prevAssignee = conversations.find((c) => c.id === id)?.assignedUserId ?? null;
    const apply = (uid: string | null) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, assignedUserId: uid } : c)),
      );
      setThreads((prev) =>
        prev[id] ? { ...prev, [id]: { ...prev[id], assignedUserId: uid } } : prev,
      );
    };
    apply(assigneeUserId);
    try {
      await api.assignConversation(id, assigneeUserId);
      const who = assigneeUserId
        ? (members.find((m) => m.user.id === assigneeUserId)?.user.name ??
          members.find((m) => m.user.id === assigneeUserId)?.user.email ??
          'agent')
        : null;
      toast('success', who ? `Assigned to ${who}.` : 'Unassigned.');
    } catch {
      apply(prevAssignee);
      toast('error', "Couldn't update the assignment — try again.");
    }
  };

  // Optimistically rewrite the active conversation's tags in both the list row
  // and the open thread, then persist. On failure the caller-provided rollback
  // restores the prior set.
  const patchTags = (id: string, updater: (ts: ConversationTag[]) => ConversationTag[]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tags: updater(c.tags ?? []) } : c)),
    );
    setThreads((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], tags: updater(prev[id].tags ?? []) } } : prev,
    );
  };

  const addTag = async (tag: ConversationTag) => {
    if (!activeId) return;
    const id = activeId;
    const current = conversations.find((c) => c.id === id)?.tags ?? [];
    if (current.some((t) => t.id === tag.id)) return;
    patchTags(id, (ts) => [...ts, tag]);
    try {
      await api.addConversationTag(id, tag.id);
    } catch {
      patchTags(id, (ts) => ts.filter((t) => t.id !== tag.id));
      toast('error', "Couldn't add the tag — try again.");
    }
  };

  const removeTag = async (tagId: string) => {
    if (!activeId) return;
    const id = activeId;
    const removed = (conversations.find((c) => c.id === id)?.tags ?? []).find(
      (t) => t.id === tagId,
    );
    patchTags(id, (ts) => ts.filter((t) => t.id !== tagId));
    try {
      await api.removeConversationTag(id, tagId);
    } catch {
      if (removed) patchTags(id, (ts) => [...ts, removed]);
      toast('error', "Couldn't remove the tag — try again.");
    }
  };

  /** Create a new palette tag and attach it to the active conversation. */
  const createTag = async (name: string, color: string) => {
    try {
      const tag = await api.createTag(name, color);
      setTags((prev) => [...prev, tag]);
      await addTag({ id: tag.id, name: tag.name, color: tag.color });
      return tag;
    } catch {
      toast('error', "Couldn't create the tag — the name may already exist.");
      return null;
    }
  };

  const send = async (text: string) => {
    if (!activeId) return;
    const now = new Date().toISOString();
    const tempId = `tmp-${Date.now()}`;
    setThreads((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        messages: [
          ...prev[activeId].messages,
          {
            id: tempId,
            conversationId: activeId,
            direction: 'out',
            sender: 'human',
            content: text,
            createdAt: now,
          },
        ],
      },
    }));
    const tryOnce = async () => {
      try {
        await api.reply(activeId, text);
      } catch {
        toast.pushSticky('error', "Couldn't send your reply — your message is still here. Retry?", {
          label: 'Retry',
          onClick: tryOnce,
        });
      }
    };
    await tryOnce();
  };

  return { takeOver, handBack, assign, addTag, removeTag, createTag, send };
}
