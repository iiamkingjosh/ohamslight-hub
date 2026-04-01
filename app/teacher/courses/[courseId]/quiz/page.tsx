'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import type { Question } from '@/types';

type QuestionDraft = Omit<Question, 'id'> & { id: string };

const emptyMCQuestion = (): QuestionDraft => ({
  id: crypto.randomUUID(),
  text: '',
  type: 'multiple-choice',
  options: ['', '', '', ''],
  correctAnswer: '',
});

export default function TeacherQuizPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    fetchQuiz();
  }, []);

  const fetchQuiz = async () => {
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/quiz`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setQuizTitle(data.title);
          setQuizDescription(data.description || '');
          setPassingScore(data.passingScore ?? 70);
          setQuestions(data.questions || []);
        }
      }
    } catch {
      toast.error('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = (type: 'multiple-choice' | 'true-false') => {
    if (type === 'true-false') {
      setQuestions([...questions, {
        id: crypto.randomUUID(),
        text: '',
        type: 'true-false',
        options: ['True', 'False'],
        correctAnswer: '',
      }]);
    } else {
      setQuestions([...questions, emptyMCQuestion()]);
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof QuestionDraft, value: any) => {
    setQuestions(questions.map((q) => {
      if (q.id !== id) return q;
      if (field === 'type') {
        return {
          ...q,
          type: value,
          options: value === 'true-false' ? ['True', 'False'] : ['', '', '', ''],
          correctAnswer: '',
        };
      }
      return { ...q, [field]: value };
    }));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map((q) => {
      if (q.id !== questionId) return q;
      const newOptions = [...q.options];
      newOptions[optionIndex] = value;
      // If correct answer was this option's old value, clear it
      const correctAnswer = q.correctAnswer === q.options[optionIndex] ? '' : q.correctAnswer;
      return { ...q, options: newOptions, correctAnswer };
    }));
  };

  const handleSave = async () => {
    if (!quizTitle.trim()) {
      toast.error('Quiz title is required');
      return;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`Question ${i + 1} is missing its text`);
        return;
      }
      if (!q.correctAnswer) {
        toast.error(`Question ${i + 1} needs a correct answer selected`);
        return;
      }
      if (q.type === 'multiple-choice') {
        const filled = q.options.filter((o) => o.trim());
        if (filled.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const idToken = await user?.getIdToken();
      const res = await fetch(`/api/teacher/courses/${courseId}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          title: quizTitle.trim(),
          description: quizDescription.trim(),
          passingScore,
          questions: questions.map((q) => ({
            ...q,
            options: q.type === 'true-false' ? ['True', 'False'] : q.options.filter((o) => o.trim()),
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Quiz saved successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm">
          ← Back
        </button>
        <h1 className="text-3xl font-bold text-white">Quiz Builder</h1>
      </div>

      {/* Quiz Meta */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6 space-y-4">
        <h2 className="text-lg font-semibold text-white mb-2">Quiz Settings</h2>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Quiz Title *</label>
          <input
            type="text"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="e.g. Module 1 Assessment"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Description (optional)</label>
          <textarea
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            rows={2}
            placeholder="Instructions or context for students"
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-none"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Passing Score: <span className="text-white font-semibold">{passingScore}%</span>
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 mb-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <span className="text-blue-400 font-semibold text-sm">Question {idx + 1}</span>
              <div className="flex items-center gap-3">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                  className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True / False</option>
                </select>
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
              rows={2}
              placeholder="Enter question text..."
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:outline-none focus:border-blue-500 resize-none mb-4"
            />

            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-1">Options — select the correct answer:</p>
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name={`correct-${q.id}`}
                    checked={q.correctAnswer === (q.type === 'true-false' ? opt : opt)}
                    onChange={() => {
                      const val = q.type === 'true-false' ? opt : opt;
                      if (val.trim()) updateQuestion(q.id, 'correctAnswer', val);
                    }}
                    className="accent-blue-500 shrink-0"
                    disabled={q.type === 'multiple-choice' && !opt.trim()}
                  />
                  {q.type === 'true-false' ? (
                    <span className="text-white text-sm">{opt}</span>
                  ) : (
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(q.id, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 bg-gray-700 text-white rounded px-3 py-1.5 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
                    />
                  )}
                  {q.correctAnswer === opt && opt.trim() && (
                    <span className="text-green-400 text-xs font-semibold shrink-0">✓ Correct</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Add Question Buttons */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => addQuestion('multiple-choice')}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Multiple Choice
        </button>
        <button
          onClick={() => addQuestion('true-false')}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          True / False
        </button>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {saving ? 'Saving...' : 'Save Quiz'}
      </button>
    </div>
  );
}
