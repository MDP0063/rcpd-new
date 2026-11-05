import React, { useEffect, useState } from 'react';
import { API_ENDPOINTS, apiFetch } from '../lib/api';

type Review = { id: string; examId: string; examTitle: string; userName: string; status: string; questions: Array<{ questionId: string; question: string; answer: string; pointsMilli: number; pointsEarnedMilli: number }> };

export const ExamCorrectionCenter: React.FC = () => {
 const [reviews, setReviews] = useState<Review[]>([]);
 const [error, setError] = useState('');
 useEffect(() => { void apiFetch<{reviews: Review[]}>(API_ENDPOINTS.ACADEMY_EXAM_REVIEW_CORRECTIONS).then(r => { if (r.ok && r.data) setReviews(r.data.reviews); else setError(r.error || 'Laden fehlgeschlagen'); }); }, []);
 return <section><h2>Abgeschlossene Bewertungen korrigieren</h2>{error && <p role="alert">{error}</p>}{reviews.map(r => <article key={r.id}><h3>{r.examTitle}</h3><p>{r.userName} · {r.status}</p>{r.questions.map(q => <p key={q.questionId}>{q.question}: {q.pointsEarnedMilli} / {q.pointsMilli}</p>)}</article>)}</section>;
};
