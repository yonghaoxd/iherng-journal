import { MessageCircleQuestion, Quote, ListChecks, AlertTriangle, Check } from 'lucide-react';
import type { AskSean } from '@/lib/articles';

/**
 * The problem-and-answer layout used by the podcast and buyer guide series.
 *
 * Every article leads with the reader's actual situation and question, gives
 * Sean's verdict before his reasoning, and ends with what to do and when the
 * advice stops applying — so a reader who stops after the first screen still
 * leaves with the answer.
 */
export function AskSeanSummary({ qa }: { qa: AskSean }) {
  const isQuestion = qa.kind === 'question';

  return (
    <div className="ask-sean">
      <section className="ask-block ask-question" aria-labelledby="ask-question-label">
        <span className="ask-label" id="ask-question-label">
          <MessageCircleQuestion size={13} />
          {isQuestion ? 'THE QUESTION' : 'THE PROBLEM'}
        </span>
        {qa.asker && <p className="ask-asker">From {qa.asker}</p>}
        <p className="ask-context">{qa.context}</p>
        <p className="ask-question-text">{qa.question}</p>
      </section>

      <section className="ask-block ask-answer" aria-labelledby="ask-answer-label">
        <span className="ask-label accent" id="ask-answer-label">
          <Quote size={13} />
          SEAN&apos;S ANSWER
        </span>
        <blockquote className="ask-quote">
          <p>&ldquo;{qa.quote}&rdquo;</p>
        </blockquote>
        <p className="ask-answer-text">{qa.answer}</p>
      </section>

      <section className="ask-block ask-why" aria-labelledby="ask-why-label">
        <h2 className="ask-heading" id="ask-why-label">
          Why
        </h2>
        <ol className="ask-reasons">
          {qa.reasons.map((reason, index) => (
            <li key={reason.title} className="ask-reason">
              <span className="ask-reason-num" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h3 className="ask-reason-title">{reason.title}</h3>
                <p className="ask-reason-body">{reason.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="ask-block ask-actions" aria-labelledby="ask-actions-label">
        <h2 className="ask-heading" id="ask-actions-label">
          <ListChecks size={18} />
          What to do
        </h2>
        <ul className="ask-action-list">
          {qa.actions.map((action) => (
            <li key={action}>
              <span className="ask-check" aria-hidden="true">
                <Check size={12} strokeWidth={3} />
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside className="ask-block ask-caveat" aria-labelledby="ask-caveat-label">
        <span className="ask-label amber" id="ask-caveat-label">
          <AlertTriangle size={13} />
          WHEN THIS DOESN&apos;T APPLY
        </span>
        <p>{qa.caveat}</p>
      </aside>
    </div>
  );
}
