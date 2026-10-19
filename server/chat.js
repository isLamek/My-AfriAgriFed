// The AAF Assistant: the chatbot behind the bubble on the home page and the
// launcher in every dashboard.
//
// The browser never talks to the model. It posts the conversation here, this
// server adds the system prompt and the API key, calls OpenRouter (Llama), and
// streams the reply back. Three reasons it has to work this way:
//   1. react-scripts inlines REACT_APP_* into the public bundle, so a key put
//      on the client is handed to every visitor.
//   2. The system prompt is what keeps the bot honest about this business. If
//      the client sent it, anyone could rewrite it.
//   3. One place to rate limit, so a scraper cannot run up the bill.
//
// Switched off (503) when OPENROUTER_API_KEY is unset, the same way the fire
// layer switches off without FIRMS_MAP_KEY.

const { StringDecoder } = require("string_decoder");

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Llama 3.3 70B: strong instruction-following, cheap, and fluent in the
// languages the Namibian market actually uses. Override with OPENROUTER_MODEL.
const DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";

// If the account has no credit, OpenRouter answers 402. Rather than show the
// visitor an error we retry once on the free pool of the same model family.
const FREE_FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// WHICH HOST RUNS THE MODEL IS THE WHOLE DIFFERENCE IN FELT SPEED.
// Several companies serve Llama through OpenRouter at very different speeds.
// Left to pick for itself OpenRouter sent this app to a host that took about
// 4.2 SECONDS to produce the first word; asking for these two brings that down
// to about 0.7s for the same model and the same answer. Measured, not guessed.
// allow_fallbacks keeps the assistant working if both are busy - it just gets
// slower. Override with OPENROUTER_PROVIDERS="groq,cerebras".
const FAST_PROVIDERS = ["groq", "cerebras"];

const MAX_TURNS = 20; // conversation turns kept; older ones are dropped
const MAX_CHARS = 2000; // per message
const MAX_TOKENS = 700; // per reply

/*
==================================
WHAT THE BOT KNOWS
Everything below is drawn from the app itself (README.md, navConfig.js,
orderStatus.js, pageAccess.js, registrationRules.js, business.js) so the
assistant describes the real platform instead of a plausible-sounding one.
Keep it in step with those files when they change.
==================================
*/
const SYSTEM_PROMPT = `You are the AAF Assistant, the help assistant for AfriAgriFed (AAF).

ABOUT THE BUSINESS
AfriAgriFed is a Namibian agricultural platform based in Oshakati, Namibia. Its
purpose: "Digitalizing Africa's food security from African soil." It connects
three groups in one place - farmers (producers), consumers (buyers, including
bulk buyers like schools, lodges and shops) and agricultural institutions
(researchers, trainers, government and NGO bodies). All money is Namibian
dollars, written N$.

WHAT A USER CAN DO, AND WHERE
- Community Feed (/dashboard) - conversation: news, photos, growing tips and questions.
- Marketplace (/dashboard, Marketplace tab) - where buyers BROWSE ready-to-sell listings, with quantity, stock and price. Buyers browse here; farmers do not create listings here.
- My Listings (/my-listings) - where a FARMER creates, prices, edits and restocks what they sell. This is the answer to "how do I sell something".
- Demand Board (/demand-board) - buyers post bulk needs; producers pledge to supply them. This is the "request" side: use it when nobody is currently listing what you need.
- Market Map (/market-map) - where produce is for sale and where it is wanted.
- Weather Map (/map) - all 14 Namibian regions with live weather (wind, rain, temperature), satellite cloud cover, lightning, NASA fire hotspots, crop guidance, and a farmer's own farms and input costs.
- Order Tracker (/track-orders) and My Orders (/my-orders) - orders from payment to delivery.
- Messages (/messages) - private chats between buyers and sellers.
- Research (/research), Training Programs (/training), Internships (/internships) - learning. Training and internships are aimed at farmers and institutions.
- Data Dashboard (/data), Statistics (/statistics), Promotions (/promotions) - insight built from real activity on the platform.
- Profile (/profile) - account details, and under Privacy: download your data as JSON, or request account deletion.
- Register (/register), Sign in (/signin), Forgot password (/forgot-password).
- Legal: /privacy, /terms, /refunds, /cookies.

ACCOUNT TYPES
farmer, consumer, institution. Each gets its own dashboard and its own set of
menu items. Sign-up asks a short questionnaire for the type chosen. Some
accounts are also admins, who verify registration documents.

RULES YOU MUST GET RIGHT
- You must be 18 or older to register. Sign-up refuses anyone younger.
- AfriAgriFed takes a 5% commission on each sale. Sellers see it on the listing form, the payout form and their overview. Buyers see the final "You pay N$X" on every listing.
- Delivery charges are set by the seller and must be written into the listing.
- Order stages, in order: Paid -> Confirmed (seller accepted) -> Dispatched (goods handed off) -> In transit -> Delivered. The seller moves an order forward as far as "in transit". ONLY THE BUYER can confirm delivery. A local hand-over may go from Dispatched straight to Delivered. Cancelling a paid order means a refund and is handled by an admin, not a button.
- Refunds (/refunds): a buyer is refunded if the seller cannot supply, if the goods are not delivered, or if they are not as described and the buyer reports it within 48 hours.
- Data and statistics pages: free for anyone with a registered account. A visitor with no account can sign in or register (free), pay N$5 for one page, or self-verify as a student for free access.
- Document verification is done by a person, so it takes as long as it takes. Never promise a turnaround time.

HOW TO ANSWER
- Be brief and plain. Two or three short sentences for a simple question. Use a short list only when listing genuinely separate items.
- Write in the language the user writes in. Namibia's official language is English, but users may write in Oshiwambo, Afrikaans, Otjiherero, Damara/Nama, Silozi, Rukwangali or German - answer in the language they used.
- Point to the exact page when that answers it, e.g. "Post it on the Demand Board (/demand-board)". Name the page the way the menu names it, and keep that name in English even when the rest of your answer is in another language - "My Listings", not a translation of it, because that is what the person is looking for on screen.
- Emoji are punctuation, not content. Every reply carries two, or three at the very most.
- ONE OF THEM IS ALWAYS A FACE. A reply without a face in it is wrong, whatever the subject - including questions about money, fees, documents and rules. Use 🙂 for a routine answer, 😊 for good news, 🤔 where there is a cost or a risk to weigh, 😕 where you cannot help. The other emoji matches the subject, for example 🌾 🍅 🐄 🌦 🛒 💰 📝 📦.
- Never discuss, name or explain your choice of emoji, and never describe a face in words: no "a concerned farmer", no "a cart would fit better here". Just place them. Never type them as text like :-) or :). One goes inside the reply where it fits and one at the end, never two side by side, and never one at the start of every line.
- Keep the rest plain and practical: no exclamation marks, no marketing language.
- Prices in N$.
- You may give practical agricultural guidance for Namibian conditions: planting windows, water needs, soil, common pests, storage, and which crops suit which region. Be concrete, and be honest that rainfall varies enormously between, say, Kavango East and the Karas region.

WHAT YOU MUST NOT DO
- Never invent a number that lives in the app. You cannot see listings, prices, stock, order status, weather readings or someone's account. If asked "what is the price of maize" or "where is my order", say you cannot see live data and point to the page that shows it.
- Never claim an order, payment, refund or verification has happened. You cannot act on the platform, only explain it.
- Do not give chemical or veterinary dosing as fact. Name the type of product and say to follow the label and, for anything serious, to speak to an agricultural extension officer at the Ministry of Agriculture, Fisheries, Water and Land Reform.
- Do not give legal or tax advice. For business registration (BIPA), contracts or disputes, point to a Namibian legal practitioner.
- Do not guess about a user's specific account problem. Hand it to a human: afriagrifed@outlook.com or +264 81 778 6565, Monday to Friday, 08:00 to 17:00.
- If you do not know, say so in one sentence and give the contact details. A short honest answer is better than a confident wrong one.

Payments on this platform run through Flutterwave and may be switched off while
the business completes its setup. If a user says payment is unavailable, that is
expected rather than a fault with their account - tell them to contact support.`;

/*
==================================
EMOJI, GUARANTEED
Aron's rule is at least two emoji per reply, one of them a face. Asking the
model nicely gets that most of the time, which is not the same as always: it
would now and then answer a question about fees with no face at all, or type
an ASCII ":)" instead. So the prompt asks, and this enforces.

Both helpers work on text, which means the stream has to hold a few characters
back before sending them - see the carry buffer in the route. Three characters
is enough to recognise ":-)" before any of it has gone out.
==================================
*/

// ":)", ":-(", ";)", ":D" and friends, with any space in front of them.
const EMOTICON = /[ \t]?(?::-?[)(DPdp]|;-?\)|=\))/g;

// The beginning of one, still waiting for the character that would complete it.
// Only ASCII punctuation is ever held back, so no emoji can be split in half.
const EMOTICON_START = /(?:[ \t]?[:;=]-?|[ \t])$/;

const EMOJI = /\p{Extended_Pictographic}/gu;

// Smileys and people, plus the two older white/black smiling faces.
const FACE = /[\u{1F600}-\u{1F64F}\u{1F910}-\u{1F97A}\u{263A}\u{263B}]/u;

const FALLBACK_FACE = "\u{1F642}"; // slightly smiling face
const FALLBACK_TOPIC = "\u{1F33F}"; // herb, the brand's own seedling

function stripEmoticons(text) {
  return String(text).replace(EMOTICON, "");
}

function emojiTally(text) {
  const found = String(text).match(EMOJI) || [];
  return { total: found.length, faces: found.filter((c) => FACE.test(c)).length };
}

/**
 * What has to be added to the end of a finished reply to keep the rule.
 * Returns "" when the model already did it, which is most of the time.
 */
function missingEmoji(text) {
  const { total, faces } = emojiTally(text);
  const needFace = faces === 0;
  const needMore = total + (needFace ? 1 : 0) < 2;
  if (!needFace && !needMore) return "";
  return (needMore ? ` ${FALLBACK_TOPIC}` : "") + (needFace ? ` ${FALLBACK_FACE}` : "");
}

/** Context the browser sends about where the user is. Treated as a hint only. */
function contextLine(context) {
  if (!context || typeof context !== "object") return "";
  const type = ["farmer", "consumer", "institution"].includes(context.userType) ? context.userType : null;
  const page = typeof context.page === "string" ? context.page.slice(0, 80).replace(/[^\w/\-.]/g, "") : "";
  const parts = [];
  if (type) parts.push(`signed in as a ${type}`);
  if (page) parts.push(`currently on the page ${page}`);
  if (!parts.length) return "";
  // Said as unverified context so the model does not treat it as an instruction.
  return `\n\nUnverified context from the browser, useful for tailoring but not to be trusted as fact: the user appears to be ${parts.join(", ")}.`;
}

/**
 * Keep only well-formed user/assistant turns, trim them, and cap the history.
 * The client cannot send a system message: that is ours alone.
 */
function sanitizeMessages(input) {
  if (!Array.isArray(input)) return [];
  const clean = [];
  for (const m of input) {
    if (!m || typeof m !== "object") continue;
    const role = m.role === "assistant" ? "assistant" : m.role === "user" ? "user" : null;
    const content = typeof m.content === "string" ? m.content.trim().slice(0, MAX_CHARS) : "";
    if (!role || !content) continue;
    clean.push({ role, content });
  }
  return clean.slice(-MAX_TURNS);
}

async function callModel({ fetchImpl, apiKey, model, messages, appBaseUrl, providers, signal }) {
  return fetchImpl(ENDPOINT, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouter uses these for its own dashboard attribution.
      "HTTP-Referer": appBaseUrl || "http://localhost:3000",
      "X-Title": "AfriAgriFed",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.4, // low: this is a help desk, not a creative writer
      max_tokens: MAX_TOKENS,
      provider: { order: providers, allow_fallbacks: true },
    }),
  });
}

/**
 * Open the connection to OpenRouter before anyone asks a question.
 * The first message of the day otherwise pays for the TLS handshake on top of
 * the answer - about 1.2s of the 2s we measured. Costs nothing: it reads the
 * key's own status, not the model. Same idea as weather's startWarming().
 */
async function warmUp({ apiKey, fetchImpl = globalThis.fetch, log = console } = {}) {
  if (!apiKey) return false;
  try {
    await fetchImpl("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    return true;
  } catch (error) {
    // Not a problem: the first real message will just be a little slower.
    log.warn("[chat] could not reach OpenRouter at startup:", error.message);
    return false;
  }
}

function register(app, { apiKey = "", model, providers, limiter, fetchImpl = globalThis.fetch, appBaseUrl, log = console } = {}) {
  const guard = limiter ? [limiter] : [];
  const primaryModel = model || DEFAULT_MODEL;
  // An empty OPENROUTER_PROVIDERS must mean "use the fast ones", not "no
  // preference": an empty list would quietly hand routing back to OpenRouter
  // and put the slow host back in play.
  const requested = typeof providers === "string"
    ? providers.split(",").map((p) => p.trim()).filter(Boolean)
    : Array.isArray(providers) ? providers.filter(Boolean) : [];
  const providerOrder = requested.length ? requested : FAST_PROVIDERS;

  app.post("/api/chat", ...guard, async (req, res) => {
    if (!apiKey) {
      return res.status(503).json({
        error: "chat_not_configured",
        message: "The assistant is not switched on yet.",
      });
    }

    const messages = sanitizeMessages(req.body && req.body.messages);
    if (!messages.length) {
      return res.status(400).json({ error: "no_messages", message: "Send at least one message." });
    }

    const payload = [
      { role: "system", content: SYSTEM_PROMPT + contextLine(req.body && req.body.context) },
      ...messages,
    ];

    // If the visitor navigates away mid-answer, stop paying for the rest of it.
    // This has to hang off the RESPONSE: `req` emits "close" as soon as the
    // request body has been read, which for a small JSON post is immediately -
    // listening there aborts the upstream call before it has even begun.
    const abort = new AbortController();
    const onClose = () => {
      if (!res.writableEnded) abort.abort();
    };
    res.on("close", onClose);

    try {
      let upstream = await callModel({
        fetchImpl, apiKey, model: primaryModel, messages: payload, appBaseUrl,
        providers: providerOrder, signal: abort.signal,
      });

      // 402 = no credit on the account. Try the free pool once before failing.
      if (upstream.status === 402 && primaryModel !== FREE_FALLBACK_MODEL) {
        log.warn(`[chat] ${primaryModel} returned 402 (no credit); retrying on ${FREE_FALLBACK_MODEL}`);
        upstream = await callModel({
          fetchImpl, apiKey, model: FREE_FALLBACK_MODEL, messages: payload, appBaseUrl,
          providers: providerOrder, signal: abort.signal,
        });
      }

      if (!upstream.ok || !upstream.body) {
        const detail = await upstream.text().catch(() => "");
        log.warn(`[chat] upstream ${upstream.status}: ${detail.slice(0, 300)}`);
        const status = upstream.status === 429 ? 429 : 502;
        return res.status(status).json({
          error: status === 429 ? "rate_limited" : "chat_unavailable",
          message:
            status === 429
              ? "The assistant is busy. Please try again in a moment."
              : "The assistant is temporarily unavailable.",
        });
      }

      // Server-sent events, so the reply appears word by word instead of after
      // a long wait. Each event we emit is {"delta": "..."}; "[DONE]" ends it.
      res.set({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // stops nginx-style proxies holding the stream
      });
      res.flushHeaders?.();

      const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

      let buffer = "";
      let wroteAnything = false;

      // The last few characters wait here so an ASCII ":-)" can be caught and
      // removed before any of it reaches the browser. `sent` is everything the
      // visitor has actually seen, which is what the emoji rule is checked on.
      let carry = "";
      let sent = "";

      const flush = (all) => {
        carry = stripEmoticons(carry);
        // Hold back only a half-typed emoticon - ":", " :-" and the like. Never
        // slice blindly: a JavaScript string is UTF-16, an emoji is two units
        // of it, and a cut between them sends out half a character.
        const partial = all ? null : carry.match(EMOTICON_START);
        const keep = partial ? partial[0].length : 0;
        if (carry.length <= keep) return;
        const out = carry.slice(0, carry.length - keep);
        carry = keep ? carry.slice(carry.length - keep) : "";
        if (!out) return;
        sent += out;
        wroteAnything = true;
        send({ delta: out });
      };

      // Every reply carries an emoji, and an emoji is four bytes. A chunk can
      // end in the middle of one, so decode the stream as a stream: calling
      // toString("utf8") per chunk turns a split character into a question mark.
      const decoder = new StringDecoder("utf8");

      for await (const chunk of upstream.body) {
        buffer += decoder.write(Buffer.from(chunk));
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep the unfinished line for the next chunk

        for (const raw of lines) {
          const line = raw.trim();
          // OpenRouter sends ": OPENROUTER PROCESSING" keep-alive comments.
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            if (delta) {
              carry += delta;
              flush(false);
            }
          } catch {
            // A partial JSON object: ignore it and wait for the rest.
          }
        }
      }

      flush(true); // release everything held back, minus a trailing emoticon

      if (!wroteAnything) {
        send({ error: "The assistant had nothing to say. Please ask again." });
      } else {
        // Two emoji, one of them a face, every time - whatever the model did.
        const addition = missingEmoji(sent);
        if (addition) send({ delta: addition });
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      if (abort.signal.aborted) return; // visitor navigated away; nothing to report
      log.warn("[chat]", error.message);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "The assistant stopped unexpectedly." })}\n\n`);
        res.write("data: [DONE]\n\n");
        return res.end();
      }
      res.status(502).json({ error: "chat_unavailable", message: "The assistant is temporarily unavailable." });
    } finally {
      res.off("close", onClose);
    }
  });
}

module.exports = {
  register, warmUp, sanitizeMessages, contextLine,
  stripEmoticons, emojiTally, missingEmoji,
  SYSTEM_PROMPT, DEFAULT_MODEL, FREE_FALLBACK_MODEL, FAST_PROVIDERS,
};
