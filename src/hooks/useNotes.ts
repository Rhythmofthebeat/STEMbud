import { useState, useEffect, useCallback } from 'react';
import type { Note } from '../types';
import { supabase } from '../lib/supabase';

const LOCAL_NOTES_KEY = 'stembud_notes';
const uid = () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function loadLocalNotes(): Note[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTES_KEY);
    return raw ? (JSON.parse(raw) as Note[]) : [];
  } catch { return []; }
}

function saveLocalNotes(notes: Note[]) {
  localStorage.setItem(LOCAL_NOTES_KEY, JSON.stringify(notes));
}

export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotes(loadLocalNotes().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      return;
    }
    const { data } = await supabase
      .from('notes')
      .select('id, title, content, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setNotes((data ?? []).map((r) => ({ id: r.id, title: r.title, content: r.content, updatedAt: r.updated_at })));
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createNote = useCallback(async (): Promise<Note> => {
    const now = new Date().toISOString();
    if (!userId) {
      const note: Note = { id: uid(), title: 'Untitled note', content: '', updatedAt: now };
      const next = [note, ...loadLocalNotes()];
      saveLocalNotes(next);
      setNotes(next);
      return note;
    }
    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, title: 'Untitled note', content: '' })
      .select('id, title, content, updated_at')
      .single();
    if (error || !data) throw error ?? new Error('Failed to create note');
    const note: Note = { id: data.id, title: data.title, content: data.content, updatedAt: data.updated_at };
    setNotes((prev) => [note, ...prev]);
    return note;
  }, [userId]);

  const updateNote = useCallback(async (id: string, patch: { title?: string; content?: string }) => {
    const now = new Date().toISOString();
    if (!userId) {
      const current = loadLocalNotes();
      const next = current.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n));
      saveLocalNotes(next);
      setNotes(next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      return;
    }
    await supabase.from('notes').update({ ...patch, updated_at: now }).eq('id', id);
    setNotes((prev) =>
      prev
        .map((n) => (n.id === id ? { ...n, ...patch, updatedAt: now } : n))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    );
  }, [userId]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) {
      const next = loadLocalNotes().filter((n) => n.id !== id);
      saveLocalNotes(next);
      setNotes(next);
      return;
    }
    await supabase.from('notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, [userId]);

  return { notes, createNote, updateNote, deleteNote };
}
