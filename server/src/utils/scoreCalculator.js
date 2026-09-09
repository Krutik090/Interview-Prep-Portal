// Grades a quiz attempt against its question bank. Pure/deterministic —
// no external calls — which is why quiz submission stays synchronous
// instead of going through a background job like the AI-driven module types.
export function gradeQuiz(questions, answers) {
  const answerByIndex = new Map(answers.map((a) => [a.questionIndex, a.answerText]));
  let earned = 0;
  let total = 0;

  const graded = questions.map((question, index) => {
    total += question.points ?? 1;
    const answerText = answerByIndex.get(index) ?? '';
    const isCorrect =
      question.type === 'mcq'
        ? Number(answerText) === question.correctAnswerIndex
        : normalize(answerText) === normalize(question.correctAnswerText ?? '');
    const pointsAwarded = isCorrect ? question.points ?? 1 : 0;
    earned += pointsAwarded;
    return { questionIndex: index, answerText, isCorrect, pointsAwarded };
  });

  const scorePct = total > 0 ? Math.round((earned / total) * 100) : 0;
  return { graded, scorePct };
}

function normalize(text) {
  return String(text).trim().toLowerCase();
}
