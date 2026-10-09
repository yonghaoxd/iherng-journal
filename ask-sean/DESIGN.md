# Ask Sean (iherng) — 设计文档

> 状态：P1–P3 已完成并上线 · 2026-10-07
> - 问答页：https://iherng-journal.pages.dev/ask
> - 后台：https://ask-sean-api.yonghaomah.workers.dev（D1 数据库 `ask-sean`，亚太区）
> - 限额：不限每人提问次数（2026-10-09 取消原本的每天 3 次）；全站每天花费上限 US$1，用完后当天暂停新回答

## 1. 目标与边界

- 一个英文问答网站：观众问马来西亚房地产问题（例如 *landed or condo?*），机器人**只根据 iherng Journal 的文章**回答，并附上文章和原视频的链接。
- 参考 ask.lizheng.ai：回答都能追溯到出处，资料里没有的就明说，问答公开展示。
- 两个优先目标：**回答准确**和**省 token**。每次只读相关的文章，不把整个资料库塞给模型。
- 定位是粉丝项目，没有获得 Sean 的授权。页面要写清楚「独立项目，AI 回答，不是 Sean 本人」，公开推广之前先联系 Sean。

### 已确认的决策

| 项目 | 决定 |
|---|---|
| 资料来源 | **线上网站** https://iherng-journal.pages.dev：先读 `feed.xml` 拿到文章列表，再解析每篇文章页面。不读本地文件，也不去 YouTube（2026-10-06 改） |
| 资料范围 | feed 里所有 Buyer Guides 和 iherng Podcast 文章（目前 9 + 9 = 18 篇），网站加了新文章就会跟着收进来。不包括 Property Reviews |
| 语言 | **回答一律用简体中文**，不管用什么语言提问；保留马来西亚常用的英文房产词（condo、landed、subsale、SPA、EPF…）和 RM 金额（2026-10-06 改，原为英文） |
| 回答方式 | **直接给方案**：第一句是 Sean 的明确建议，接着一小段理由（谁的案例、哪一年），然后 2–4 个可以照着做的步骤，最后可选一行「注意：」说明不适用的情况。建议一律写成「Sean 建议… / 按 Sean 的做法…」，不以机器人的名义下指令 |
| 对话形式 | 一问一答，可以追问 1 次 |
| 资料里没有的问题 | 直接说 Sean 没讲过，并推荐相关文章，这一步不调用模型 |
| 模型 | DeepSeek `deepseek-flash`（V4.1 Flash），**关闭思考模式** |
| 技术栈 | **Cloudflare Worker + D1**（后台，在本仓库）+ Journal 网站里的 `/ask` 页面（前台）。原计划的 Vercel + Supabase 改掉了：Journal 本来就部署在 Cloudflare Pages 上，这样不用另开账号（2026-10-06 改） |
| 放置方式 | 和 Journal 放在同一个网站：导航栏加一项「Ask Sean」，页面是 `/ask`，样式沿用 Journal 的深色主题 |
| 向量 | 不用 |

## 2. 资料现状（2026-10-06，线上网站）

- 18 篇：Buyer Guides 9 篇（2017–2025），iherng Podcast 9 篇（Asking Sean #239–#322，2024–2026）。
- **每篇都根据完整字幕写成**，385–521 词，统一采用「Ask Sean」问答格式：
  - 观众的问题：谁问的 + 具体情况（年龄、收入、楼盘）+ 问题本身；
  - **Sean 的原话**：逐字引用，也是唯一可以加引号的 Sean 的话；
  - Sean 的回答：Journal 的转述；
  - 4 条理由、5 条建议，以及「什么情况下不适用」；
  - 来源说明（`.sources-note`）。
- 网页上每一部分都有专门的 class 名（`.ask-context`、`.ask-quote`、`.ask-reason` 等），同步脚本就是按这些 class 名拆分的。网站改版导致找不到这些部分时，同步会直接报错，不会悄悄漏掉内容。
- **注意这几点：**
  - 每篇都是在回答**某一位观众的情况**，所以回答时要说明是谁的案例，并用「什么情况下不适用」说明建议的适用范围。
  - 2017 年和 2019 年的文章里涉及的费用、税率可能已经过时，回答时要提醒用户。
- 之前本地版本的问题（3 篇 Podcast 只有节目简介，约 100 词；`closing` 编辑说明被说成 Sean 的话），线上新版里都已经不存在了。

## 3. 架构总览

```
离线（只在文章有变动时运行）
  https://iherng-journal.pages.dev/feed.xml + 每篇文章页面
      │  sync：只取 Buyer Guides 和 iherng Podcast 两个系列，按 class 名拆分，计算每篇的哈希
      ▼
  knowledge/articles/<slug>.json      ← 标准化后的文章
      │  enrich：只处理新增或改过的文章，用 DeepSeek 生成同义词和「这篇能回答的问题」
      ▼
  knowledge/enrich/<slug>.json        ← 生成后你人工审核
      │  build
      ▼
  knowledge/catalog.json              ← 精简目录，用来做路由（18 篇实测约 6k token）

在线（/api/ask）
  ① 拦截     免费      长度不超过 300 字符、每天次数限制、全站每日花费上限
  ② 旧答案   免费      pg_trgm 相似度够高，并且资料版本相同 → 直接返回旧答案，ask_count 加 1
  ③ 路由     实测约 $0.00009  DeepSeek 读目录（94% 走缓存）→ 最多选 2 篇，或者判断为 none
               none → 用模板回复「Sean 还没讲过」+ 推荐 3 篇文章（这一步结束，不再调用模型）
  ④ 回答     实测约 $0.0003   只把选中的 ≤2 篇文章交给 DeepSeek，关闭思考，中文约 250 字 + 步骤，输出上限 600 token
  ⑤ 存储     免费      存进 questions 表，公开问答流就从这张表读
```

### 为什么用「目录路由」，而不是关键词检索（BM25）

- 资料不多：18 篇做成的目录约 6k token，而且每次都完全一样，能走缓存价（每百万 token $0.003），实测 94% 的输入命中缓存。
- 让模型读目录来挑文章，能理解近义词（condo = apartment = high-rise）。马来西亚观众用中文或马来文提问，它也能对上；还能顺便判断问题是不是超出资料范围。关键词检索在这几点上都容易失手。
- 实测每题 $0.00007，大约占总成本的四分之一，换来的是准确率（测试 46/46）。
- 目录大小随文章数线性增长，每篇约 330 token。到约 100 篇（约 33k token）时，走缓存每题约 $0.0001，依然很便宜。再往上，就先用 BM25 筛出 30 篇候选，再交给模型路由。**这次先不做 BM25。**

## 4. 离线流程

| 脚本 | 输入 | 输出 | 说明 |
|---|---|---|---|
| `scripts/sync.ts` | 线上网站的 `feed.xml` 和文章页面（`JOURNAL_SITE_URL`） | `knowledge/articles/*.json`、`knowledge/manifest.json`（记录每篇的哈希） | 标题、日期、视频信息从页面的 JSON-LD 读取；正文按 `.ask-*` class 名拆分；根据来源说明标上 `basis`；从视频标题里解析出 Asking Sean 的期号 |
| `scripts/enrich.ts` | 新增或改过的文章 | `knowledge/enrich/*.json` | 每篇生成 `aliases`（同义词）和 `questions`（5 个这篇能回答的问题），一次约 $0.002。**模型生成的同义词有噪音，必须人工审核**（见第 11 节） |
| `scripts/build.ts` | articles + enrich | `knowledge/catalog.json`（含 `version`） | 目录排序固定，内容里不放时间戳，保证每次一模一样，才能命中缓存 |
| `scripts/eval-route.ts` | `evals/route.jsonl`（46 题） | 路由准确率、拒答准确率、成本 | 每次约 $0.003 |
| `scripts/eval-answers.ts` | `evals/answers.jsonl`（13 题） | 自动检查 + Markdown 报告供人工阅读 | 每次约 $0.003 |
| `scripts/ask.ts` | 一个问题 | 回答、来源、成本 | 命令行调试用 |

catalog 里每篇文章的条目：

```json
{ "id": "apartment-vs-landed", "title": "...", "date": "2024-02-20", "series": "iherng-podcast",
  "tag": "Own stay", "excerpt": "...", "headings": ["..."], "takeaways": ["..."],
  "aliases": ["condo", "high-rise", "terrace", "landed house"],
  "questions": ["Should I buy a condo or a landed house?", "..."] }
```

## 5. 在线流程细节

### ③ 路由调用
- System 部分：路由规则 + 完整目录，**内容固定，所以能走缓存**；用户的问题放在最后面。
- 用 JSON 输出：`{"answer": ["apartment-vs-landed"], "related": ["choosing-own-stay-home"]}`，`max_tokens: 80`。`answer` 为空表示超出范围，`related` 用于推荐阅读。模型编造的 id 会被过滤掉。
- 如果是追问，输入里加上「上一个问题 + 上一个回答的 TL;DR」，大约多 100 token。

### ④ 回答调用
- 参数：`model: "deepseek-flash"`，`thinking: {"type": "disabled"}`，`temperature: 0.3`，`max_tokens: 400`（提示词要求约 150 词，上限只是余量）。
- 输入格式（**不包含** `closing` 编辑说明。测试中模型即使被告知也仍会把它说成 Sean 的话，所以干脆不给）：
  ```
  <article id="A1" title="..." date="2024-02-20" source="Asking Sean #241" basis="episode notes only">
  Key points: ...
  ## A comparison with context
  ...
  </article>
  Question: ...
  ```
- 回答规则写在 `lib/answer.ts` 的 system prompt 里，以代码为准。要点如下：
  1. 只能根据给的文章回答，没讲到的就用一句话说明，不能凭常识补充。
  2. 第一次引用某篇文章时要带年份：「In a 2025 episode, Sean suggests…」。
  3. 只说明 Sean 的判断方法，不替用户下结论。
  4. 只有 `episode notes only` 的文章才提醒去看原视频。
  5. 提到费用、利率、价格或市场判断时，用一句短话提醒是哪年的说法、需要核实。不要另写一整段「文章没讲到什么」。
  6. 只回答被问的部分，约 150 词；TL;DR 不超过 30 词，不带引用标记；2–3 段，每段末尾标 `[A1]`。
- **由页面渲染、不让模型生成的部分**：免责声明、来源卡片（标题、日期、文章链接、YouTube 链接）、「看原视频」按钮。这样能省输出 token，内容也不会出错。

### 超出范围时的模板（不调用模型）
> Sean hasn't covered this in the Journal yet. Related reads: … ·（如果问的是具体楼盘，再加一句：Property reviews are on the Journal's Property Reviews page.）

## 6. 成本估算（DeepSeek 非高峰时段的价格）

以下是 2026-10-06 用线上 18 篇文章、在非高峰时段实测的数字：

| 步骤 | 输入 | 输出 | 实测费用 |
|---|---|---|---|
| 路由 | 约 6k 目录（94% 走缓存） | 约 40 | 约 $0.00009 |
| 回答（中文） | 系统提示（走缓存）+ 1–2 篇文章（每篇约 700 token）+ 问题 | 约 300–450 | 约 $0.0003 |
| **每个回答过的新问题合计** | | | **约 $0.0004**（高峰时段约 $0.0008） |
| 超出范围的问题 | 只有路由 | 9–36 | 约 $0.00006 |
| 重复问题 | 0 | 0 | 不花钱 |

- 1 美元大约能回答 1,250–2,500 个新问题。改成中文、并加上步骤清单之后，输出 token 比英文版多约 40%，这是每题变贵的主要原因。
- 收紧回答规则（约 150 词、不另写免责段落）之后，每题输出从平均约 350 token 降到约 250 token，回答测试的总花费下降了 21%（$0.00386 → $0.00305），截断从 3 题降到 0 题。
- **花钱最多的是输出 token**，所以关闭思考、限制输出长度、免责声明和来源由页面渲染，这三件事最重要。
- 安全阀：
  - 每个 IP 每天最多问 5 个新问题，看旧答案不限次数；
  - 全站每天花费超过 US$1 时，暂停新的回答。

## 7. 怎么保证准确

1. 路由测试：`evals/route.jsonl` 里有 46 道题（回答测试另有 `evals/answers.jsonl` 13 道），包括：
   - 应该命中的，比如 landed vs condo → apartment-vs-landed，「85% rule」→ choosing-own-stay-home；
   - 应该拒答的，比如问 Teja Subang Jaya 好不好、问股票。
2. 回答抽检：每次修改提示词之后，抽 10 道题人工看，重点检查有没有乱归到 Sean 头上、引用标记对不对。
3. 旧答案复用时要比对 `kb_version`：文章改过之后，旧答案自动失效，不再复用。
4. 每条回答都记下用了多少 token、花了多少钱，方便随时核对成本。

## 8. 后台：Cloudflare Worker + D1（2026-10-06）

```
Journal 网站 /ask 页面（静态）──fetch──▶ ask-sean-api Worker ──▶ DeepSeek
                                              │
                                              └─ D1：questions、rate_limits
```

- **接口**（`worker/index.ts`）：
  - `POST /api/ask {question, parentId?}`：提问。如果是追问，带上要追问的那个回答的 id。
  - `GET /api/questions?sort=recent|popular`：公开问答流。只显示回答过的顶层问题，不含追问和被隐藏的。
  - `GET /api/questions/:id`：单个问答，附带它的追问。
  - `GET /api/health`
- **数据库**：结构见 `migrations/0001_init.sql`。`questions` 表存每个问答，记录 token 用量和花费；`rate_limits` 表按「IP 哈希 + 日期」计次，IP 只存加盐后的 SHA-256 哈希。
- **复用旧答案**：用 `lib/similar.ts`，D1 是 SQLite，没有 pg_trgm，所以改为在 Worker 里计算相似度。
  - 先找规范化后完全相同的问题；找不到再拿最近 500 个问题，按字符二元组计算相似度，达到 **0.9** 才复用。
  - **两个问题里的数字必须完全一样**（RM5,000 和 RM15,000 不会被当成同一题）。
  - 门槛设得高，是因为「适合买吗」和「适合卖吗」的相似度有 0.83，错误复用比多回答一次（约 $0.0004）糟糕得多。
  - 只在同一个资料版本内复用，追问一律不复用。
- **保护措施**：
  - 每个 IP 每天 5 个新问题，复用的旧答案不算次数；
  - 全站当天花费达到 US$1 就暂停新回答；
  - 只接受 `ALLOWED_ORIGINS` 列出的网站从浏览器调用（CORS）。
- **隐藏某个问题**：
  ```
  npx wrangler d1 execute ask-sean --remote --command "UPDATE questions SET hidden = 1 WHERE id = '<id>'"
  ```
- **知识库进入 Worker 的方式**：`npm run kb:build` 会额外生成 `knowledge/bundle.json`（目录 + 全部文章），部署时直接打包进 Worker。更新知识库后，只要重新部署 Worker，不用重新部署 Journal。

## 9. 目录结构

```
asking_iherng/
├── DESIGN.md
├── knowledge/
│   ├── articles/*.json      # sync 生成
│   ├── enrich/*.json        # enrich 生成，人工审核
│   ├── catalog.json         # build 生成
│   ├── bundle.json          # build 生成，打包进 Worker
│   └── manifest.json
├── scripts/                 # sync / enrich / build / eval（TypeScript，用 tsx 运行）
├── evals/route.jsonl, evals/answers.jsonl
├── lib/                     # 路由、回答、相似问题、DeepSeek 客户端，脚本和 Worker 共用
├── worker/index.ts          # Cloudflare Worker：/api/*
├── migrations/              # D1 数据库结构
├── wrangler.toml            # Worker 配置（D1 绑定、限额、允许的网站）
└── .env                     # DEEPSEEK_API_KEY（本地开发时 wrangler dev 也从这里读）

iherng_blog（Journal，分支 ask-sean）
├── app/ask/page.tsx         # /ask 页面
├── components/ask-sean-chat.tsx  # 提问框、回答、来源、追问、公开问答流
├── lib/ask-api.ts           # 调用 Worker；本地开发时自动连 127.0.0.1:8787
├── components/journal-nav.tsx    # 导航栏加「Ask Sean」
└── site.config.json         # askApiUrl：Worker 的线上网址
```

## 10. 分阶段计划

| 阶段 | 内容 | 需要你准备的 |
|---|---|---|
| P1 知识库 ✅ | sync、enrich、build，然后跑路由测试 | DeepSeek API key（写进 `.env`） |
| P2 回答 ✅ | 回答提示词、命令行版的 `ask`，然后跑回答抽检 | — |
| P3 网站 ✅ | Worker + D1 后台、Journal 的 `/ask` 页面和导航栏，2026-10-07 上线 | — |
| P4 内容 | Podcast 文章已在线上改写完成；Journal 已加上「Ask Sean」入口（随 P3 一起上线） | — |

## 11. 测试结果（2026-10-05）

### 路由（`npm run eval:route`）

| 版本 | 总分 | 正常问题选对 | 错误拒答 | 该拒答的拒答了 | 每题成本 |
|---|---|---|---|---|---|
| 不补同义词 | 41/43 | 34/36 | 1 | 7/7 | $0.000073 |
| 补同义词（第一版提示词） | 42/43 | 35/36 | 0 | 7/7 | $0.000078 |
| 补同义词 + 3 道陷阱题 | 45/46 | 36/36 | 0 | 9/10 | $0.000072 |
| 删掉不该有的同义词 | **46/46** | 36/36 | 0 | 10/10 | $0.000067 |

- 补同义词修好了「Will property prices crash next year?」（原本被误判为预测类问题而拒答）。
- **同义词噪音会造成真实错误**：模型给「提前还贷」那篇加了 refinance、flexi loan 等文章没讲的词，导致「要不要 refinance 成 flexi loan」被错误地导过去。删掉这些词后就修好了。所以 `knowledge/enrich/` 必须人工审核，审核过的把 `reviewed` 改成 `true`。
- 生成同义词的提示词第一版举了具体例子（subsale、condo…），模型把这些词照抄进了大多数文章。已改成映射式的例子，并要求「只为文章真正讨论的内容写同义词」。

### 回答（`npm run eval:answers`）

| 版本 | 自动检查 | 截断 | 总成本 |
|---|---|---|---|
| 第一版提示词 | 9/13 | 3 | $0.00386 |
| 收紧长度和格式 | 12/13 | 0 | $0.00312 |
| 不再给模型编辑说明 | **13/13** | 0 | $0.00305 |

人工阅读后发现、并已修正的问题：
- 把 Journal 编辑写的 `closing` 说成 Sean 的建议，提示词明确禁止后仍然出现。→ 不再把它交给模型，并加了自动检查（连续 5 个词和编辑说明重合即标记）。
- 回答太长、把整篇文章改写一遍，几乎每题结尾都有一段「文章没讲到…」。→ 要求约 150 词、只回答被问的部分。
- TL;DR 里带 `[A1]` 引用标记。→ 解析时去掉。

仍需注意：只有节目简介的文章（3 篇 Podcast），模型会在「怎么套用到你的情况」这部分做较多推导。有原文依据，但比较薄。根本的解决办法是把这些文章写充实。

### 改读线上网站之后（2026-10-06，18 篇）

| 测试 | 结果 | 成本 |
|---|---|---|
| 路由（56 题：46 道正常问题 + 10 道应拒答） | 第一次 55/56 → 改路由规则后 **56/56** | 每题 $0.00009 |
| 回答（15 题） | **15/15** 通过自动检查，人工阅读忠于原文 | 每个回答约 $0.00034 |

- 线上文章全部改写成问答格式，并新增了 6 篇 Podcast。原来针对旧文章的应对办法已经不需要了：给模型的输入里本来就没有编辑说明了；3 篇只有节目简介的文章，现在也都根据完整字幕写成了。
- 回答规则新增：说明是哪位观众的案例；用「什么情况下不适用」说明建议的适用范围；只有 Sean 的原话可以加引号。自动检查也相应改成：引号里超过 4 个词的内容，必须出自 Sean 的原话。
- 「Will property prices crash next year?」又被误判为预测类问题而拒答。这次不靠同义词碰巧修好，而是在路由规则里写明：问预测或时机的问题，如果有文章讲了 Sean 怎么看择时，就算在范围内。
- 18 篇的同义词已逐篇审核（`reviewed: true`）。删掉的主要是两类：泛泛的房型词（condo、apartment、high-rise），以及文章没讲的话题（refinance、flexi loan、freehold、leasehold 等）。另外换掉了 7 个答不了、或者会和别的文章抢题的示例问题（包括一道会触发「车贷」陷阱题的）。
- 测试题已按新内容更新：新版 new-launch 那篇不再讲建造期利息，相关题目换掉了；有多篇新文章都能回答的题，放宽了可接受的答案范围；新增 6 篇各补了题目，包括中文和马来文提问。

### 改成中文、直接给方案之后（2026-10-06）

| 版本 | 自动检查 | 每个回答 |
|---|---|---|
| 中文第一版 | 13/15 | 约 $0.0004 |
| 修正格式和引号规则 | **15/15** | 约 $0.0004 |

- 自动检查相应改成：必须是中文、必须有编号步骤、建议必须写成 Sean 的（回答里要出现 "Sean"），长度按「中文字数 + 英文词数」计算。引号检查也加上了中文：引号里超过 10 个汉字的内容会被标记，因为 Sean 的原话都是英文。
- 第一版发现的问题，都已修正：
  - 步骤后面多写的「不适用」段落没标出处 → 允许最后加一行「注意：…」，必须带出处；
  - 把观众的问题放进了引号 → 引号只能用于 Sean 的原话；
  - 称 iherng Journal 的计算器为「本站」 → 必须写「iherng Journal 的…」；
  - 有一题输出 501 token，差点超过 500 的上限 → 上限改为 600。
