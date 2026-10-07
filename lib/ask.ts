import { answer, type Citation } from "./answer";
import { addUsage, type Usage } from "./deepseek";
import { route, type FollowUp } from "./router";
import type { Article, Knowledge } from "./types";

export const MAX_QUESTION_CHARS = 300;

export const OUT_OF_SCOPE_MESSAGE =
  "Sean 在 iherng Journal 的文章里还没讲过这个问题，所以这里没有可靠的资料可以回答。";

export type AskResult =
  | { status: "rejected"; reason: string }
  | { status: "out_of_scope"; message: string; related: Article[]; usage: Usage }
  | {
      status: "answered";
      tldr: string;
      body: string;
      citations: Citation[];
      related: Article[];
      usage: Usage;
      truncated: boolean;
      missingTldr: boolean;
    };

export function checkQuestion(raw: string): { question: string } | { reason: string } {
  const question = raw.replace(/\s+/g, " ").trim();
  // Four characters still allows short Chinese questions such as 「买房好吗」.
  if (question.length < 4) return { reason: "请输入完整的问题。" };
  if (question.length > MAX_QUESTION_CHARS) {
    return { reason: `问题请控制在 ${MAX_QUESTION_CHARS} 个字以内。` };
  }
  return { question };
}

/**
 * Route, then answer from at most two articles. Out-of-scope questions stop after
 * the router call. Caching repeat questions and rate limits live in the API layer.
 */
export async function ask(raw: string, knowledge: Knowledge, followUp?: FollowUp): Promise<AskResult> {
  const checked = checkQuestion(raw);
  if ("reason" in checked) return { status: "rejected", reason: checked.reason };

  const routed = await route(checked.question, knowledge.catalog, followUp);
  const lookup = (ids: string[]) =>
    ids.map((id) => knowledge.articles.get(id)).filter((article): article is Article => Boolean(article));
  const sources = lookup(routed.answer);
  const related = lookup(routed.related);

  if (sources.length === 0) {
    return { status: "out_of_scope", message: OUT_OF_SCOPE_MESSAGE, related, usage: routed.usage };
  }

  const result = await answer(checked.question, sources, followUp);
  return {
    status: "answered",
    tldr: result.tldr,
    body: result.body,
    citations: result.citations,
    related,
    usage: addUsage(routed.usage, result.usage),
    truncated: result.truncated,
    missingTldr: result.missingTldr,
  };
}
