/**
 * The AI Q&A's name. Set as one word, "AIherng" reads as "Alherng" because a
 * capital I and a lowercase l look alike, so "AI" is always set apart: an
 * italic terracotta accent in serif headings, a bolder weight in sans text.
 * The two parts touch, so it is still read and copied as "AIherng".
 */
export function AIherngName({
  variant = 'sans',
}: {
  variant?: 'serif' | 'sans';
}) {
  return (
    <span className={`aiherng-name ${variant}`}>
      <span className="aiherng-ai">AI</span>herng
    </span>
  );
}
