# AIherng (Ask Sean) — 设计文档

> 状态：已上线 · 本文更新于 2026-10-13
> - 问答页：https://iherng-journal.pages.dev/ask
> - 后台：https://ask-sean-api.yonghaomah.workers.dev（D1 数据库 `ask-sean`，亚太区）
> - 代码：仓库 [`yonghaoxd/iherng-journal`](https://github.com/yonghaoxd/iherng-journal) 的 `ask-sean/` 文件夹
> - 限额：不限每人提问次数（`DAILY_NEW_ANSWERS_PER_IP = "0"`）；全站每天花费上限 US$1，用完后当天暂停新回答

## English summary

AIherng answers Malaysian property questions in Sean Tan's (@iherng) voice, using
only the iherng Journal's Q&A articles, each written from the full captions of one
of his episodes. Every answer cites the articles it used and links to the original
video.

- **Retrieval without vectors.** The model routes each question by reading a compact
  catalog of all articles (title, excerpt, aliases, sample questions). The catalog is
  byte-identical between calls, so 99% of the router's input tokens are served from
  DeepSeek's prompt cache. It picks at most two articles, or declines. A decline costs
  nothing further: the page shows a template with related reading.
- **Grounded answers.** Only the chosen articles go to the answer call. The prompt
  forbids facts that aren't in them, separates "the episode's viewer" from "the
  asker", and credits guests (a lawyer, a mortgage specialist) by name. Only Sean's
  verbatim line may appear in quotation marks.
- **Cheap by design.** Thinking mode is off. Disclaimers and source cards are
  rendered by the page, not generated. Near-duplicate questions reuse a stored answer
  for free; matching uses character bigrams plus an exact-number check, and is
  versioned by catalog and prompt.
- **Measured.**

  | Eval | Result | Cost |
  | --- | --- | --- |
  | Router | 56/56 | about $0.0004 per question |
  | Answer rule checks | 14/15 | about $0.0011 per answered question, routing included |

  Costs are at DeepSeek's peak prices; off-peak is half.

  The router set has 48 in-scope questions in English, Chinese and Malay, plus 8
  traps such as stock tips, prompt injection and named projects. Section 11 has
  the full eval history.
- **Stack.** A Cloudflare Worker with D1 (SQLite), DeepSeek `deepseek-flash`, and a
  static Next.js-on-Vite site on Cloudflare Pages.
- **Keeping current.** A daily GitHub Actions job syncs new articles from the live
  site, enriches them, and gates deployment on `eval:route --strict`.

The rest of this document is in Chinese.

## 1. 目标与边界

- 观众用任何语言问马来西亚房地产问题（例如 *landed or condo?*），机器人**只根据 iherng Journal 的文章**回答，回答用简体中文，并附上文章和原视频的链接。
- 参考 ask.lizheng.ai：回答都能追溯到出处，资料里没有的就明说，问答公开展示。
- 两个优先目标：**回答准确**和**省 token**。每次只读相关的文章，不把整个资料库塞给模型。
- 定位是粉丝项目，没有获得 Sean 的授权。页面写清楚「独立项目，由 AI 以 Sean 的口吻写成，不是 Sean 本人」，公开推广之前先联系 Sean。

### 已确认的决策

| 项目 | 决定 |
|---|---|
| 资料来源 | **仓库里的内容文件** `content/articles/*.json`（2026-11 起）。Buyer Guides 和 iherng Podcast 不再发布成网页，只作为 AIherng 的知识库；之前是读线上网站的 `feed.xml` 和文章页面 |
| 资料范围 | feed 里所有 Buyer Guides 和 iherng Podcast 文章，网站加了新文章，每天的同步就会收进来。不包括 Property Reviews |
| 语言 | **用什么语言问就用什么语言答**（2026-11 起，`sean-10`）：中文问题答简体中文，英文答英文，马来文答马来文；保留马来西亚常用的英文房产词（condo、landed、subsale、SPA、EPF…）和 RM 金额。网站界面改成英文 |
| 回答方式 | **以 Sean 的口吻、第一人称**回答（「我的看法很直接」「换作是我」），像他在 iherng Podcast 上跟观众讲话：先下判断，用提问者自己的数字算账，再给 3–5 个可以照着做的步骤。只能说文章和经验法则里他讲过的话，不能替他编口头禅。嘉宾（律师、房贷专员）的建议要写明是谁说的。页面注明回答由 AI 以 Sean 的口吻写成 |
| 对话形式 | 一问一答，可以追问 1 次 |
| 结合个人处境 | 可选：提问者填写目标、现况、已经试过的做法，回答会套用到他身上。**这类回答不公开、不复用、不存储**，只记录花费（`private_usage` 表） |
| 资料里没有的问题 | 直接说 Sean 没讲过，并推荐相关文章，这一步不调用回答模型 |
| 模型 | DeepSeek `deepseek-flash`，**关闭思考模式** |
| 技术栈 | **Cloudflare Worker + D1**（后台）+ Journal 网站里的 `/ask` 页面（前台）。Journal 本来就部署在 Cloudflare Pages 上，不用另开账号 |
| 放置方式 | 和 Journal 放在同一个网站和同一个仓库：导航栏的「AIherng」，页面是 `/ask`，样式沿用 Journal 的深色主题 |
| 向量 | 不用（见第 3 节） |

## 2. 资料现状

- 知识库目前收录网站上全部 **136 篇**问答文章（Buyer Guides 和 iherng Podcast）。新文章发布后，由每天的同步收进来。
- 其中 118 篇的同义词由模型生成、还没人工审核（`reviewed: false`）。每日更新会开一个 issue 列出这些文章；在审核之前，路由测试是唯一的把关。
- **每篇都根据完整字幕写成**，统一采用「Ask Sean」问答格式：
  - 观众的问题：谁问的 + 具体情况（年龄、收入、楼盘）+ 问题本身；
  - **原话**：逐字引用，少于 15 个词，是唯一可以加引号的话；嘉宾回答时是嘉宾的原话（`answeredBy`）；
  - 回答：Journal 的转述；
  - 4 条理由、5 条建议，以及「什么情况下不适用」；
  - 来源说明（`.sources-note`）。
- 网页上每一部分都有专门的 class 名（`.ask-context`、`.ask-quote`、`.ask-reason` 等），同步脚本按这些 class 名拆分。网站改版导致找不到这些部分时，同步会直接报错，不会悄悄漏掉内容。
- **注意这几点：**
  - 每篇都是在回答**某一位观众的情况**，所以给模型的输入把那位观众明确标成「另一个人」，免得把他的情况套到提问者身上。
  - 2017 年和 2019 年的文章里涉及的费用、税率可能已经过时，回答要提醒用户确认。

## 3. 架构总览

```
离线（GitHub Actions 每天 10:00 MYT，或新文章发布后）
  content/articles/*.json（Buyer Guides + iherng Podcast）
      │  sync：只取 Buyer Guides 和 iherng Podcast，按 class 名拆分，计算每篇的哈希
      ▼
  knowledge/articles/<slug>.json      ← 标准化后的文章
      │  enrich：只处理新增或改过的文章，用 DeepSeek 生成同义词和「这篇能回答的问题」
      ▼
  knowledge/enrich/<slug>.json        ← 生成后人工审核（reviewed: true）
      │  build
      ▼
  knowledge/catalog.json              ← 精简目录，用来做路由（136 篇约 46k token）
  knowledge/bundle.json               ← 目录 + 全部文章，打包进 Worker
      │  eval:route --strict 通过才部署
      ▼
  Cloudflare Worker（ask-sean-api）

在线（POST /api/ask）
  ① 拦截     免费      问题不超过 300 字符、（可选）每 IP 每日次数、全站每日花费上限
  ② 旧答案   免费      D1 + lib/similar.ts：字符二元组相似度 ≥ 0.9、数字完全相同、
                       资料版本和回答风格相同 → 直接返回旧答案，ask_count 加 1
  ③ 路由     约 $0.0004  DeepSeek 读目录（99% 走缓存）→ 最多选 2 篇，或者判断为 none
               none → 模板回复「Sean 还没讲过」+ 推荐 3 篇文章（不再调用模型）
  ④ 回答     约 $0.0007  只把选中的 ≤2 篇文章交给 DeepSeek，关闭思考，
                       约 400–650 字中文，输出上限 1,500 token
  ⑤ 存储     免费      存进 D1 的 questions 表，公开问答流就从这张表读
                       （结合个人处境的回答不存，只记花费）
```

### 为什么用「目录路由」，而不是关键词检索（BM25）或向量

- 目录每次都完全一样，能走缓存价。实测 99% 的路由输入命中缓存，所以目录变大，成本也涨得很慢：18 篇时每题约 $0.00009，136 篇时约 $0.0004。
- 让模型读目录挑文章，能理解近义词（condo = apartment = high-rise），观众用中文或马来文提问也能对上，还能顺便判断问题是不是超出资料范围。关键词检索在这几点上都容易失手。
- 目录大小随文章数线性增长，每篇约 340 token（加上同义词和示例问题后）。到大约 300 篇（约 100k token）时，再在路由之前加一层 BM25，先筛出约 30 篇候选。现在还不需要。

## 4. 离线流程

| 脚本 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `scripts/sync.ts` | 仓库的 `content/articles/*.json`（只取 Buyer Guides 和 iherng Podcast） | `knowledge/articles/*.json`、`knowledge/manifest.json`（记录每篇的哈希） | 直接读内容文件的 `qa` 字段；缺字段就报错；从视频标题解析出 Asking Sean 的期号。改写后在 136 篇上输出与旧版逐字相同 |
| `scripts/enrich.ts` | 新增或改过的文章 | `knowledge/enrich/*.json` | 每篇生成 `aliases`（同义词）和 `questions`（5 个这篇能回答的问题），一次约 $0.002。**模型生成的同义词有噪音，必须人工审核**（见第 11 节） |
| `scripts/build.ts` | articles + enrich | `knowledge/catalog.json`（含 `version`）、`knowledge/bundle.json` | 目录排序固定，内容里不放时间戳，保证每次一模一样，才能命中缓存 |
| `scripts/eval-route.ts` | `evals/route.jsonl`（56 题） | 路由准确率、拒答准确率、成本 | 每次约 $0.015；`--strict` 有一题不过就失败 |
| `scripts/eval-answers.ts` | `evals/answers.jsonl`（15 题） | 自动检查 + Markdown 报告供人工阅读 | 每次约 $0.01 |
| `scripts/eval-podcast.ts` | `evals/podcast.jsonl`（13 题，真实观众的处境） | 机器人回答和 Sean 在节目里的实际回答并排对照 | 人工阅读用 |
| `scripts/ask.ts` | 一个问题 | 回答、来源、成本 | 命令行调试用 |
| `scripts/auto-journal.ts` | 新上传的 Asking Sean 视频 | Journal 新文章（发布） | 每天 9:00 在本机运行，见 README |

catalog 里每篇文章的条目：

```json
{ "id": "apartment-vs-landed", "title": "...", "date": "2024-02-20", "series": "iherng-podcast",
  "tag": "Own stay", "excerpt": "...", "headings": ["..."], "takeaways": ["..."],
  "aliases": ["condo", "high-rise", "terrace", "landed house"],
  "questions": ["Should I buy a condo or a landed house?", "..."] }
```

## 5. 在线流程细节

### ③ 路由调用（`lib/router.ts`）
- System 部分：路由规则 + 完整目录，**内容固定，所以能走缓存**；用户的问题放在最后面。
- 用 JSON 输出：`{"answer": ["apartment-vs-landed"], "related": ["choosing-own-stay-home"]}`，`max_tokens: 80`，`temperature: 0`。`answer` 为空表示超出范围，`related` 用于推荐阅读。模型编造的 id 会被过滤掉。
- 如果是追问，输入里加上「上一个问题 + 上一个回答的 TL;DR」，大约多 100 token。

### ④ 回答调用（`lib/answer.ts`）
- 参数：`model: "deepseek-flash"`，`thinking: {"type": "disabled"}`，`temperature: 0.3`，`max_tokens: 1500`（`ANSWER_MAX_TOKENS`；一篇完整回答约 700–1,100 token，上限只是余量）。
- 每篇文章以 `<article id="A1">` 交给模型。节目里的观众明确标成「另一个人，不是提问者」，Sean 给他的步骤标成「Sean 对那位观众说的」。有嘉宾时加一行「Answered by: 名字, 身份（不是 Sean 本人的建议）」。
- System prompt 末尾附上 Sean 在很多集里反复讲的经验法则（四个基本步骤、六个月紧急基金、收钥匙时 RM50,000 加六个月供款、每借 RM100,000 约 RM450 月供、85% 法则只用于自住、90%/70% 贷款成数、subsale 约 18% 现金等），让回答能用提问者自己的数字算账。每一条都出自 Journal 的文章；改动时要先确认文章里有。
- 回答规则写在 `lib/answer.ts` 的 system prompt 里，以代码为准。要点：
  1. 事实和建议只能来自文章和经验法则。没讲过的点，先用半句话说明，再用 Sean 的方法（看地点、时机、现金流、持有能力）去分析，但不能编新的门槛或金额。提问者没给的数字就说「你没提到…」。
  2. 下判断：A 还是 B 就选一个，能不能买就说能、不能或先别，并说明条件。不以「看情况」开头。
  3. 像 Sean 在节目里那样，用提问者给的数字算：月供、首付后剩多少现金、够撑几个月、租金盖不盖得过月供。
  4. 只为提问者回答：只属于节目里那位观众的理由和步骤要拿掉；不提期数、文章或那位观众，也不说「你的情况跟某个案例很像」。
  5. 嘉宾的建议写明是谁的（「我请教过律师 Tea，他的建议是…」），不说成 Sean 自己的看法。
  6. 引号只能用于标了 "(verbatim)" 的原话，保留英文原文。
  7. 格式：TL;DR（不超过 50 字）→ 两三段分析，每段末尾标 `[A1]` → 【怎么做】3–5 个编号步骤 → 可选一行「注意：」。全文约 400–650 字。
- 改了回答的写法就要更新 `ANSWER_STYLE`（目前是 `sean-10`）。旧答案按「资料版本 + 回答风格」复用，所以旧风格的答案不会再被拿出来。
- **由页面渲染、不让模型生成的部分**：「AI 以 Sean 的口吻写成」的说明、免责声明、来源卡片（标题、日期、文章链接、YouTube 链接）、「看原视频」按钮。这样能省输出 token，内容也不会出错。
- 没部署前可以先 `npx wrangler versions upload` 上传一个不接流量的版本，再用 `--live --api=<preview url>` 测它。

### 超出范围时的模板（不调用回答模型）
> Sean hasn't covered this in the Journal yet. Related reads: … ·（如果问的是具体楼盘，再加一句：Property reviews are on the Journal's Property Reviews page.）

## 6. 成本（DeepSeek 高峰时段价格，非高峰减半；2026-10-13 实测，136 篇）

| 步骤 | 输入 | 输出 | 实测费用 |
|---|---|---|---|
| 路由 | 约 46k 目录（98–99% 走缓存）+ 问题 | 约 50 | 约 $0.0004 |
| 回答（中文） | 系统提示（走缓存）+ 1–2 篇文章（每篇约 700 token）+ 问题 | 约 400–650 | 约 $0.0007 |
| **每个回答过的新问题合计** | | | **约 $0.0011**（非高峰约 $0.0006） |
| 超出范围的问题 | 只有路由 | 约 20 | 约 $0.0004 |
| 重复问题 | 0 | 0 | 不花钱 |

- 1 美元大约能回答 900（高峰）到 1,800（非高峰）个新问题。
- **花钱最多的是输出 token**，所以关闭思考、限制输出长度、免责声明和来源由页面渲染，这三件事最重要。
- 2026-10-10 回答从约 150 字改成约 400–650 字的完整分析，每题成本因此从约 $0.0004 升到约 $0.0011（高峰价）。这是有意的取舍：短回答读起来太单薄。
- 安全阀（都在 `wrangler.toml` 的 `[vars]` 里设定）：
  - `DAILY_BUDGET_USD = "1"`：全站当天花费（公开回答 + 私人回答）达到 US$1，就暂停新回答；
  - `DAILY_NEW_ANSWERS_PER_IP`：每个 IP 每天最多几个新问题，复用的旧答案不算。**目前是 `"0"`，即不限**（2026-10-09 取消原本的上限），靠每日花费上限兜底；有人滥用时改回一个数字即可。

## 7. 怎么保证准确

1. 路由测试：`evals/route.jsonl` 有 56 道题，48 道应该命中（英文、中文、马来文），8 道应该拒答（问具体楼盘、股票、车贷、OPR、写代码、提示词注入）。每日更新时 `--strict` 不过就不部署。
2. 回答测试：`evals/answers.jsonl` 15 道题自动检查格式和规则（必须是中文、有编号步骤、引号里只能是原话、不能把编辑说明当成 Sean 的话），再人工阅读报告。
3. 真实对照：`evals/podcast.jsonl` 用真实 Asking Sean 观众的处境提问，把回答和 Sean 在节目里的实际回答并排比较。
4. 复用旧答案时比对 `kb_version`（目录版本 + 回答风格）：文章或写法改过之后，旧答案自动失效。
5. 每条回答都记下用了多少 token、花了多少钱，方便随时核对成本。

## 8. 后台：Cloudflare Worker + D1

```
Journal 网站 /ask 页面（静态）──fetch──▶ ask-sean-api Worker ──▶ DeepSeek
                                              │
                                              └─ D1：questions、rate_limits、private_usage
```

- **接口**（`worker/index.ts`）：
  - `POST /api/ask {question, parentId?, situation?}`：提问。追问时带上原回答的 id；带 `situation` 时是私人回答。
  - `GET /api/questions?sort=recent|popular`：公开问答流。只显示回答过的顶层问题，不含追问和被隐藏的。
  - `GET /api/questions/:id`：单个问答，附带它的追问。
  - `GET /api/health`
- **数据库**：结构见 `migrations/`。`questions` 表存每个公开问答，记录 token 用量和花费；`rate_limits` 表按「IP 哈希 + 日期」计次，IP 只存加盐后的 SHA-256 哈希；`private_usage` 只存私人回答的花费。
- **复用旧答案**（`lib/similar.ts`）：D1 是 SQLite，没有 pg_trgm，所以在 Worker 里计算相似度。
  - 先找规范化后完全相同的问题；找不到再拿最近 500 个问题，按字符二元组（Dice 系数）计算相似度，达到 **0.9** 才复用。字符二元组对中文、英文、马来文都适用。
  - **两个问题里的数字必须完全一样**（RM5,000 和 RM15,000 不会被当成同一题）。
  - 门槛设得高，是因为「适合买吗」和「适合卖吗」的相似度有 0.83，错误复用比多回答一次糟糕得多。
  - 只在同一个 `kb_version` 内复用；追问和私人回答一律不复用。
- **保护措施**：每日花费上限、可选的每 IP 次数限制（见第 6 节）；只接受 `ALLOWED_ORIGINS` 列出的网站从浏览器调用（CORS）。
- **隐藏某个问题**：
  ```
  npx wrangler d1 execute ask-sean --remote --command "UPDATE questions SET hidden = 1 WHERE id = '<id>'"
  ```
- **知识库进入 Worker 的方式**：`npm run kb:build` 生成 `knowledge/bundle.json`，部署时直接打包进 Worker。更新知识库后只要重新部署 Worker，不用重新部署 Journal。

## 9. 目录结构

```
iherng-journal/                       # 仓库根目录：Journal 网站
├── app/ask/page.tsx                  # /ask 页面
├── components/ask-sean-chat.tsx      # 提问框、处境、回答、来源、追问、公开问答流
├── components/journal-nav.tsx        # 导航栏的「AIherng」
├── lib/ask-api.ts                    # 调用 Worker；本地开发时自动连 127.0.0.1:8787
├── site.config.json                  # askApiUrl：Worker 的线上网址
├── .github/workflows/update-knowledge.yml   # 每日同步、测试、部署 Worker
└── ask-sean/                         # 本文档所在的文件夹：问答后台
    ├── DESIGN.md
    ├── knowledge/
    │   ├── articles/*.json           # sync 生成
    │   ├── enrich/*.json             # enrich 生成，人工审核
    │   ├── catalog.json              # build 生成
    │   ├── bundle.json               # build 生成，打包进 Worker
    │   └── manifest.json
    ├── scripts/                      # sync / enrich / build / eval / auto-journal（TypeScript，用 tsx 运行）
    ├── evals/route.jsonl, answers.jsonl, podcast.jsonl
    ├── lib/                          # 路由、回答、相似问题、DeepSeek 客户端，脚本和 Worker 共用
    ├── worker/index.ts               # Cloudflare Worker：/api/*
    ├── migrations/                   # D1 数据库结构
    ├── wrangler.toml                 # Worker 配置（D1 绑定、限额、允许的网站）
    └── .env                          # DEEPSEEK_API_KEY（不进仓库）
```

（2026-10 之前，后台是独立的 `asking-iherng` 仓库，后来并进了 Journal 仓库。）

## 10. 分阶段计划

| 阶段 | 内容 | 状态 |
|---|---|---|
| P1 知识库 | sync、enrich、build，然后跑路由测试 | ✅ |
| P2 回答 | 回答提示词、命令行版的 `ask`，然后跑回答抽检 | ✅ |
| P3 网站 | Worker + D1 后台、Journal 的 `/ask` 页面和导航栏，2026-10-07 上线 | ✅ |
| P4 自动化 | 新视频自动写成文章（auto-journal）；每日同步知识库并以测试把关部署 | ✅ |
| P5 口吻与处境 | 以 Sean 的口吻、第一人称回答；可选的个人处境（不存储） | ✅ 2026-10-11 |

## 11. 测试结果

### 目前（2026-10-13，136 篇，回答风格 `sean-9`）

| 测试 | 结果 | 成本 |
|---|---|---|
| 路由（56 题：48 道正常 + 8 道应拒答） | **56/56**；拒答 8/8，误拒 0 | 每题约 $0.0004（98–99% 输入走缓存） |
| 回答（15 题） | **14/15** 通过自动检查 | 每个回答约 $0.0011（含路由） |

- 回答的自动检查跟着 `sean-8` 更新：原本要求回答里出现 "Sean"、不许出现「节目」和年份，但第一人称的写法本来就不写 Sean，也允许「我在节目里讲过」和「这是 2019 年的数字」这类提醒。改成：必须用第一人称（我）、不能用第三人称提 Sean；继续标记「案例」「那一集」等提到节目观众的说法。改之前是 2/15，几乎全是检查本身过时造成的。
- 检查更新后是 14/15，剩下 1 题是真问题：回答写了「你的情况跟我在节目里讲过的一个案例很像」，违反规则 4（不把提问者和节目里的观众相比）。提示词的规则 6 补上反例（不说「你的情况跟…很像」「我讲过一个案例」），回答风格改为 `sean-9`，在 116 篇上重测 15/15，并人工检查 13 个回答都没有再拿节目观众来比。
- 收进全部 136 篇后重测是 14/15：有一个回答最后一个步骤漏了 `[A1]` 引用标记。这种格式失误时有时无，上一轮就没有出现。
- 知识库从 66 篇增加到 116 篇后，路由第一次跑出 52/56。没过的 4 题都是路由选中了新加的、更对题的文章（例如「首购族该不该买拍卖屋」选中了专讲拍卖屋的新指南），旧的预期答案里还没有这些文章。逐题核对文章内容后，把它们加进可接受的答案，没有改路由规则。「房东每间房要留多少现金缓冲」有两篇新文章都讲「每间房留六个月供款」，路由在两者之间轮换，所以两篇都算对。
- 再从 116 篇加到 136 篇时，同样有 2 题选中了新的、更对题的文章（用成交价数据判断楼盘价格、refinance 指南），核对后一并加进可接受的答案。

### 历史记录

以下是当时的数字和设置，现行设置以上文为准。

**2026-10-05，最早的本地版本（12 篇）**

路由（`npm run eval:route`）：

| 版本 | 总分 | 正常问题选对 | 错误拒答 | 该拒答的拒答了 | 每题成本 |
|---|---|---|---|---|---|
| 不补同义词 | 41/43 | 34/36 | 1 | 7/7 | $0.000073 |
| 补同义词（第一版提示词） | 42/43 | 35/36 | 0 | 7/7 | $0.000078 |
| 补同义词 + 3 道陷阱题 | 45/46 | 36/36 | 0 | 9/10 | $0.000072 |
| 删掉不该有的同义词 | **46/46** | 36/36 | 0 | 10/10 | $0.000067 |

- 补同义词修好了「Will property prices crash next year?」（原本被误判为预测类问题而拒答）。
- **同义词噪音会造成真实错误**：模型给「提前还贷」那篇加了 refinance、flexi loan 等文章没讲的词，导致「要不要 refinance 成 flexi loan」被错误地导过去。删掉这些词后就修好了。所以 `knowledge/enrich/` 必须人工审核，审核过的把 `reviewed` 改成 `true`。
- 生成同义词的提示词第一版举了具体例子（subsale、condo…），模型把这些词照抄进了大多数文章。已改成映射式的例子，并要求「只为文章真正讨论的内容写同义词」。

回答（`npm run eval:answers`，当时为英文回答）：

| 版本 | 自动检查 | 截断 | 总成本 |
|---|---|---|---|
| 第一版提示词 | 9/13 | 3 | $0.00386 |
| 收紧长度和格式 | 12/13 | 0 | $0.00312 |
| 不再给模型编辑说明 | **13/13** | 0 | $0.00305 |

人工阅读后发现、并已修正的问题：
- 把 Journal 编辑写的 `closing` 说成 Sean 的建议，提示词明确禁止后仍然出现。→ 不再把它交给模型，并加了自动检查（连续 5 个词和编辑说明重合即标记）。
- 回答太长、把整篇文章改写一遍。→ 当时要求约 150 词、只回答被问的部分。
- TL;DR 里带 `[A1]` 引用标记。→ 解析时去掉。

**2026-10-06，改读线上网站（18 篇）**

| 测试 | 结果 | 成本 |
|---|---|---|
| 路由（56 题：46 道正常问题 + 10 道应拒答） | 第一次 55/56 → 改路由规则后 **56/56** | 每题 $0.00009 |
| 回答（15 题） | **15/15** 通过自动检查，人工阅读忠于原文 | 每个回答约 $0.00034 |

- 线上文章全部改写成问答格式，并新增了 6 篇 Podcast，原来只有节目简介的 3 篇也根据完整字幕重写。
- 回答规则新增：只有 Sean 的原话可以加引号；自动检查相应改成引号里超过 4 个词的内容必须出自原话。
- 「Will property prices crash next year?」又被误判为预测类问题而拒答。这次在路由规则里写明：问预测或时机的问题，如果有文章讲了 Sean 怎么看择时，就算在范围内。
- 同义词逐篇审核（`reviewed: true`），删掉的主要是两类：泛泛的房型词（condo、apartment、high-rise），以及文章没讲的话题（refinance、flexi loan、freehold、leasehold 等）。

**2026-10-06，回答改成中文、直接给方案**

| 版本 | 自动检查 | 每个回答 |
|---|---|---|
| 中文第一版 | 13/15 | 约 $0.0004 |
| 修正格式和引号规则 | **15/15** | 约 $0.0004 |

- 自动检查改成：必须是中文、必须有编号步骤、长度按「中文字数 + 英文词数」计算；引号里超过 10 个汉字的内容会被标记，因为原话都是英文。
- 修正的问题：步骤后多写的「不适用」段落没标出处（→ 允许最后一行「注意：…」，必须带出处）；把观众的问题放进了引号；称 iherng Journal 的计算器为「本站」。
- 有一题输出 501 token，接近当时 500 的上限，于是上限改为 600。**2026-10-10 回答改为完整分析（约 400–650 字）后，上限提高到现在的 1,500。**

**2026-10-10 至 10-11，回答改为 Sean 的口吻**

- 用 `evals/podcast.jsonl` 的 10 位真实观众处境测试：在未部署的预览版本上，10 题都选中了正确的那一集，并给出和 Sean 一致的判断（改之前是 6 题）。
- 之后改为第一人称（`sean-8`）。因为这等于让 AI 替真人说话，提示词禁止编造口头禅、门槛和金额，禁止替提问者假设事实，并保留嘉宾署名。
