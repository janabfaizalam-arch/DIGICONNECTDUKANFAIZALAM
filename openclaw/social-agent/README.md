# Dukan Dost — OpenClaw social media agent

An [OpenClaw](https://docs.openclaw.ai) agent that runs DigiConnect Dukan's social media
with you over Telegram. Host it on [Agent37](https://www.agent37.com) (managed OpenClaw)
or any OpenClaw host.

You message it like a colleague ("Dhanteras ke liye GST post banao"). It researches the
facts, writes Hinglish posts for each platform, makes a poster, and sends you a preview.
**It posts only after you reply "approve".** It also watches Facebook/Instagram comments
and drafts replies for you, plans the week, and sends a weekly performance digest.

## How it fits with the website's pipeline

The website already auto-posts one service post every day at 10:00 IST
(`/api/cron/marketing-agents`, see [docs/MARKETING_AGENTS.md](../../docs/MARKETING_AGENTS.md)).
This agent does what that pipeline can't:

| Website pipeline (Vercel)             | Dukan Dost (OpenClaw)                                      |
| ------------------------------------- | ---------------------------------------------------------- |
| One fixed service post a day, fully automatic | Posts on request: festivals, deadlines, offers, news |
| Writes a blog article                 | Previews in chat; you edit by replying                      |
| —                                     | Finds unanswered comments and drafts replies               |
| —                                     | Weekly plan and weekly performance digest                  |

Both use the **same environment variable names** for the platforms, so you can copy the
values from Vercel. The agent avoids posting generic promos around 10:00 IST so the two
don't collide.

## What's in here

```
openclaw/social-agent/
├── openclaw.json5        # config to merge into ~/.openclaw/openclaw.json
├── env.example           # every variable, with where to get it
├── setup-cron.sh         # daily brief, comment sweeps, weekly plan & digest
└── workspace/            # → copy to ~/.openclaw/workspace on the host
    ├── AGENTS.md         # operating rules (approval gate, coordination, facts)
    ├── SOUL.md           # persona and tone
    ├── IDENTITY.md  USER.md  TOOLS.md  HEARTBEAT.md
    ├── content/          # calendar.md, posted.md, drafts/
    └── skills/
        ├── social-writer/      # writes drafts (Hinglish, per-platform, fact rules)
        ├── social-publish/     # previews and publishes; scripts/social.mjs
        ├── engagement-inbox/   # comment triage + drafted replies
        └── content-calendar/   # weekly plan around real dates
```

## Setup

### 1. Create the OpenClaw instance

On Agent37, create an instance from the dashboard (Basic is enough; this agent does not
need browser automation). Connect a chat model as Agent37 prompts you to. On a
self-hosted box, install OpenClaw and run `openclaw onboard`.

### 2. Create a Telegram bot for your chat with the agent

In Telegram, open **@BotFather** → `/newbot` → save the token. This is a **new** bot, just
for you and the agent. Get your numeric user id from **@userinfobot**.

### 3. Copy the workspace and config

From a shell on the instance:

```bash
git clone https://github.com/janabfaizalam-arch/DIGICONNECTDUKANFAIZALAM.git dukan
mkdir -p ~/.openclaw/workspace
cp -r dukan/openclaw/social-agent/workspace/. ~/.openclaw/workspace/
cp dukan/openclaw/social-agent/env.example ~/.openclaw/.env
```

Merge the keys from `openclaw.json5` into `~/.openclaw/openclaw.json`, keeping whatever
model/provider settings the host already has.

### 4. Fill in `~/.openclaw/.env`

Fill `DUKAN_DOST_TELEGRAM_TOKEN`, `OWNER_TELEGRAM_ID`, `GEMINI_API_KEY`, and the platform
variables you use (copy them from Vercel). Leave a platform blank to skip it. For comment
replies, the Meta token also needs `pages_manage_engagement` and
`instagram_manage_comments`.

Never paste tokens into the Telegram chat. The agent is told never to ask for them.

### 5. Start and check

```bash
openclaw gateway restart
openclaw skills list          # should show the 4 skills above
cd ~/.openclaw/workspace && node skills/social-publish/scripts/social.mjs status
```

`status` shows ✅/❌ per platform and never prints the values. Message your bot "hi". It
should answer as Dukan Dost.

### 6. Turn on the schedules

```bash
OWNER_TELEGRAM_ID=<your id> sh dukan/openclaw/social-agent/setup-cron.sh
```

| Job               | When (IST)          | Does                                         |
| ----------------- | ------------------- | -------------------------------------------- |
| Daily social brief| 08:00 every day     | Today's plan; drafts anything due            |
| Comment sweep     | 12:00 and 19:00     | Unanswered comments + drafted replies        |
| Weekly plan       | Monday 09:30        | Next 7 days in `content/calendar.md`         |
| Weekly digest     | Sunday 19:00        | Engagement numbers and one suggestion        |

None of them publish. They send you a preview, and you approve.

## Using it

- "Kal Dhanteras hai — GST registration ka post banao, poster ke saath"
- "Is hafte kya post karein?"
- "Comments dikhao" → "approve 1 and 3" / "2 ka reply thoda formal karo"
- "Pichhle hafte kaunsa post sabse accha chala?"
- "Sirf Facebook aur Instagram par daalo"

## Safety built in

- **Approval in code, not just in the prompt.** `social.mjs post`/`reply` only preview
  unless given `--confirm`, and the agent may add that only after your approval in chat.
- **No double posts.** Each draft is logged per platform, and a second run skips the
  platforms it already reached.
- **No secrets in output.** Errors are redacted. The agent never reads or prints
  credentials.
- **Honest content.** It checks facts on official sources and sends you the links. It
  never claims to be the government and never guarantees approval.
- **Only you can command it.** Telegram `dmPolicy: "allowlist"` with your user id.

## Developing

The publisher is dependency-free Node (20+). Its tests run with the repo's suite:

```bash
npx vitest run openclaw
```

Manual dry run against the sample draft (no network):

```bash
cd openclaw/social-agent/workspace
node skills/social-publish/scripts/social.mjs preview content/drafts/example-itr-reminder.json
```
