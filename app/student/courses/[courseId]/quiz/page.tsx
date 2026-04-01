'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
}

interface SafeQuiz {
  id: string;
  title: string;
  description: string;
  passingScore: number;
  questions: QuizQuestion[];
}

interface QuizResult {
  score: number;
  passed: boolean;
  passingScore: number;
  results: { questionId: string; correct: boolean; correctAnswer: string }[];
}

export default function StudentQuizPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quiz, setQuiz] = useState<SafeQuiz | null>(null);
  const [lastAttempt, setLastAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [showRetake, setShowRetake] = useState(false);

  useEffect(() => {
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/student/courses/${courseId}/quiz`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const data = await res.json();
      setQuiz(data.quiz);
      setLastAttempt(data.lastAttempt);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const allAnswered = quiz ? quiz.questions.every((q) => answers[q.id]) : false;

  const handleSubmit = async () => {
    if (!quiz || !allAnswered) return;

    setSubmitting(true);
    try {
      const idToken = await user?.getIdToken();
      const orderedAnswers = quiz.questions.map((q) => answers[q.id]);

      const res = await fetch(`/api/student/courses/${courseId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ answers: orderedAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      if (data.passed) toast.success('You passed! Your certificate has been issued.');
      else toast.error(`You scored ${data.score}%. Passing score is ${data.passingScore}%.`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResult(null);
    setShowRetake(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-400 text-lg">No quiz available for this course yet.</p>
        <button onClick={() => router.back()} className="mt-4 text-blue-400 hover:underline">
          ← Back to course
        </button>
      </div>
    );
  }

  // Show result screen
  if (result) {
    const passed = result.passed;
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-green-900/40 border border-green-500' : 'bg-red-900/40 border border-red-500'}`}>
          <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            {passed ? 'You Passed!' : 'Keep Practicing'}
          </h2>
          <p className="text-gray-300 text-lg mb-1">
            Your score: <span className="font-bold text-white">{result.score}%</span>
          </p>
          <p className="text-gray-400 text-sm">
            Passing score: {result.passingScore}% &mdash; Correct: {result.results.filter((r) => r.correct).length} / {result.results.length}
          </p>
        </div>

        {/* Per-question breakdown */}
        <div className="space-y-4 mb-8">
          {quiz.questions.map((q, idx) => {
            const qResult = result.results.find((r) => r.questionId === q.id);
            const isCorrect = qResult?.correct;
            return (
              <div
                key={q.id}
                className={`rounded-xl p-4 border ${isCorrect ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}
              >
                <p className="text-sm text-gray-400 mb-1">Question {idx + 1}</p>
                <p className="text-white font-medium mb-2">{q.text}</p>
                <p className="text-sm">
                  Your answer:{' '}
                  <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {answers[q.id]}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-sm text-green-400">
                    Correct answer: {qResult?.correctAnswer}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-4">
          {passed && (
            <Link
              href={`/student/courses/${courseId}/certificate`}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl text-center transition-colors"
            >
              View Certificate
            </Link>
          )}
          <button
            onClick={handleRetake}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {passed ? 'Retake Quiz' : 'Try Again'}
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Show previous attempt banner
  const showPreviousBanner = lastAttempt && !showRetake;

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">{quiz.title}</h1>
      </div>

      {quiz.description && (
        <p className="text-gray-400 mb-6 bg-gray-800 rounded-xl px-5 py-4">{quiz.description}</p>
      )}

      <p className="text-sm text-gray-400 mb-6">
        Passing score: <span className="text-white font-semibold">{quiz.passingScore}%</span> &mdash;{' '}
        {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
      </p>

      {showPreviousBanner && (
        <div className={`rounded-xl p-4 mb-6 border ${lastAttempt.passed ? 'border-green-600 bg-green-900/20' : 'border-yellow-600 bg-yellow-900/20'}`}>
          <p className="text-white font-medium">
            Previous attempt:{' '}
            <span className={lastAttempt.passed ? 'text-green-400' : 'text-yellow-400'}>
              {lastAttempt.score}% — {lastAttempt.passed ? 'Passed' : 'Failed'}
            </span>
          </p>
          <div className="flex gap-3 mt-3">
            {lastAttempt.passed && (
              <Link
                href={`/student/courses/${courseId}/certificate`}
                className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg transition-colors"
              >
                View Certificate
              </Link>
            )}
            <button
              onClick={() => setShowRetake(true)}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      )}

      {(!lastAttempt || showRetake) && (
        <>
          <div className="space-y-6 mb-8">
            {quiz.questions.map((q, idx) => (
              <div key={q.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <p className="text-xs text-blue-400 font-semibold mb-2">Question {idx + 1}</p>
                <p className="text-white font-medium mb-4">{q.text}</p>
                <div className="space-y-2">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                        answers[q.id] === opt
                          ? 'border-blue-500 bg-blue-900/30'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => handleAnswer(q.id, opt)}
                        className="accent-blue-500"
                      />
                      <span className="text-white text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
          >
            {submitting ? 'Submitting...' : allAnswered ? 'Submit Quiz' : `Answer all ${quiz.questions.length} questions to submit`}
          </button>
        </>
      )}
    </div>
  );
}
