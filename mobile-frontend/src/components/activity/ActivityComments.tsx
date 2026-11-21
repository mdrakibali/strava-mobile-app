import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, Button, Divider, ErrorState, IconButton, SectionTitle, TextField } from '../../design';
import { CommentView, mergeCommentLists, toAthleteSummary } from '../../lib/activityView';
import { formatRelative } from '../../lib/format';
import { changeCommentsCount, useSocial } from '../../lib/social';
import { api } from '../../services/api';

interface Props {
  activityId: string;
  initialComments: CommentView[];
  isOwner: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onCommentsCountChange?: (count: number) => void;
  onComposerFocus?: () => void;
}

export const ActivityComments: React.FC<Props> = ({
  activityId,
  initialComments,
  isOwner,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onCommentsCountChange,
  onComposerFocus,
}) => {
  const social = useSocial(activityId, { hasKudos: null, kudosCount: 0, commentsCount: initialComments.length });
  const incomingKey = `${social.commentsCount}:${initialComments.map((c) => `${c.id}:${c.updatedAt ?? ''}:${c.content}`).join('|')}`;
  const [appliedKey, setAppliedKey] = useState(incomingKey);
  const [comments, setComments] = useState<CommentView[]>(initialComments);
  if (appliedKey !== incomingKey) {
    setAppliedKey(incomingKey);
    setComments((prev) => mergeCommentLists(prev, initialComments, social.commentsCount));
  }
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const onCommentMenu = (c: CommentView) => {
    const mine = c.author.id === currentUserId;
    const buttons: any[] = [];
    if (mine) buttons.push({ text: 'Edit', onPress: () => setEditing({ id: c.id, text: c.content }) });
    if (mine || isOwner) {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete comment?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                const removed = c;
                setComments((prev) => prev.filter((x) => x.id !== removed.id));
                try {
                  const newCount = await changeCommentsCount(activityId, -1, async () => {
                    const res = await api.activities.deleteComment(activityId, removed.id);
                    return res?.commentsCount;
                  });
                  onCommentsCountChange?.(newCount);
                } catch (e: any) {
                  setComments((prev) => (prev.some((x) => x.id === removed.id) ? prev : [...prev, removed].sort((a, b) => a.createdAt.localeCompare(b.createdAt))));
                  Alert.alert('Couldn’t delete', e?.message ?? 'Please try again.');
                }
              },
            },
          ]),
      });
    }
    if (!buttons.length) return;
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Comment', undefined, buttons);
  };

  const onSaveEdit = async () => {
    if (!editing || !editing.text.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await api.activities.editComment(activityId, editing.id, editing.text.trim());
      setComments((prev) =>
        prev.map((x) =>
          x.id === editing.id ? { ...x, content: res.comment.content, updatedAt: res.comment.updatedAt } : x
        )
      );
      setEditing(null);
    } catch (e: any) {
      Alert.alert('Couldn’t save', e?.message ?? 'Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const onPostComment = async () => {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setCommentError(null);
    try {
      let created: CommentView | null = null;
      const newCount = await changeCommentsCount(activityId, 1, async () => {
        const res = await api.activities.addComment(activityId, content);
        const c = res?.comment;
        created = {
          id: String(c?.id ?? `local_${Date.now()}`),
          content,
          createdAt: c?.createdAt ?? new Date().toISOString(),
          updatedAt: null,
          author: toAthleteSummary({ id: currentUserId, displayName: currentUserName, avatarUrl: currentUserAvatar }),
        };
        const serverCount = Number(res?.commentsCount);
        return Number.isFinite(serverCount) ? serverCount : null;
      });
      if (created) setComments((prev) => (prev.some((x) => x.id === created!.id) ? prev : [...prev, created!]));
      setDraft('');
      onCommentsCountChange?.(newCount);
    } catch (e: any) {
      setCommentError(e?.message || 'Couldn’t post your comment. Try again.');
    } finally {
      setPosting(false);
    }
  };

  const hasDraft = Boolean(draft.trim());

  return (
    <View className="mt-6 pt-6 border-t border-gray-100">
      <SectionTitle title={social.commentsCount > 0 ? `Comments (${social.commentsCount})` : 'Comments'} />
      {comments.length === 0 && social.commentsCount === 0 ? (
        <Text className="text-sm text-gray-500 py-2">No comments yet. Be the first to cheer them on!</Text>
      ) : (
        comments.map((c, i) => (
          <View key={c.id}>
            {i > 0 ? <Divider inset={48} /> : null}
            <View className="flex-row items-start py-3">
              <Avatar uri={c.author.avatarUrl} name={c.author.displayName} size={32} />
              <View className="flex-1 ml-3">
                <View className="flex-row items-center">
                  <Text className="text-sm font-bold text-gray-900 flex-shrink">{c.author.displayName}</Text>
                  <Text className="text-xs text-gray-400 ml-2">{formatRelative(c.createdAt)}</Text>
                </View>
                {editing?.id === c.id ? (
                  <View className="mt-2">
                    <TextField
                      value={editing.text}
                      onChangeText={(t) => setEditing({ id: c.id, text: t })}
                      accessibilityLabel="Edit comment"
                      maxLength={1000}
                      multiline
                    />
                    <View className="flex-row items-center mt-2 justify-end">
                      <Button label="Cancel" variant="ghost" size="sm" onPress={() => setEditing(null)} />
                      <Button
                        label="Save"
                        size="sm"
                        loading={savingEdit}
                        disabled={!editing.text.trim()}
                        onPress={onSaveEdit}
                        style={{ marginLeft: 8 }}
                      />
                    </View>
                  </View>
                ) : (
                  <Text className="text-sm text-gray-800 mt-1">
                    {c.content}
                    {c.updatedAt ? <Text className="text-xs text-gray-400"> (edited)</Text> : null}
                  </Text>
                )}
              </View>
              {(c.author.id === currentUserId || isOwner) && editing?.id !== c.id ? (
                <IconButton
                  icon="ellipsis-horizontal"
                  size={36}
                  accessibilityLabel="Comment options"
                  onPress={() => onCommentMenu(c)}
                />
              ) : null}
            </View>
          </View>
        ))
      )}

      {/* Prominent, always-visible Comment Composer */}
      <View className="mt-4 flex-row items-center bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
        <Avatar uri={currentUserAvatar} name={currentUserName} size={32} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add a comment..."
          placeholderTextColor="#9CA3AF"
          onFocus={onComposerFocus}
          multiline
          maxLength={1000}
          className="flex-1 ml-3 py-2 text-sm text-gray-900"
          style={{ maxHeight: 80 }}
        />
        <TouchableOpacity
          onPress={onPostComment}
          disabled={!hasDraft || posting}
          activeOpacity={0.8}
          className={`flex-row items-center px-3.5 py-2 rounded-full ml-2 ${
            hasDraft ? 'bg-[#FC4C02]' : 'bg-gray-200'
          }`}>
          {posting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={14} color={hasDraft ? '#FFFFFF' : '#9CA3AF'} />
              <Text className={`font-bold text-xs ml-1.5 ${hasDraft ? 'text-white' : 'text-gray-400'}`}>
                Post
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {commentError ? (
        <View className="mt-2">
          <ErrorState compact message={commentError} />
        </View>
      ) : null}
    </View>
  );
};
