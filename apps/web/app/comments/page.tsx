'use client';

import { useEffect, useState } from 'react';
import { CommentsClient } from './CommentsClient';
import { api, type CommentRow, type CommentRule } from '@/lib/api';

export default function CommentsPage() {
  const [comments, setComments] = useState<CommentRow[] | null>(null);
  const [rules, setRules] = useState<CommentRule[]>([]);
  useEffect(() => {
    Promise.all([api.listComments(), api.listCommentRules()])
      .then(([c, r]) => {
        setComments(c);
        setRules(r);
      })
      .catch(() => setComments([]));
  }, []);
  if (comments === null) return null;
  return <CommentsClient initialComments={comments} initialRules={rules} />;
}
