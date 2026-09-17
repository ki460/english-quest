# Content file spec (English Quest — kids' English learning game, ages 6-12, Japan)

Each level lives in ONE JavaScript file `js/data/<level>.js` that assigns to `window.ENG_DATA.<level>`.
Levels: g5 (英検5級), g4 (英検4級), g3 (英検3級), p2 (英検準2級), g2 (英検2級).
The file must be plain ES5-compatible JavaScript (no imports, no template literals needed), UTF-8, and evaluate with no dependencies.

```js
// js/data/g5.js — 英検5級
window.ENG_DATA = window.ENG_DATA || {};
window.ENG_DATA.g5 = {
  themes: [
    // [key, 日本語のテーマ名 (short, kid-readable), emoji]
    ["greet", "あいさつ", "👋"],
    ["family", "かぞく", "👨‍👩‍👧"]
  ],
  words: [
    // [english, japanese meaning, emoji or "", pos, themeKey]
    ["hello", "こんにちは", "👋", "int", "greet"],
    ["mother", "おかあさん", "👩", "n", "family"]
  ],
  blank: [
    // Eiken-style fill in the blank: [sentence containing ___, [4 options], answerIndex(0-3), Japanese translation of the full sentence]
    ["I ___ a student.", ["am", "is", "are", "be"], 0, "わたしは学生です。"]
  ],
  reply: [
    // Conversation: [what A says, [4 possible replies by B], answerIndex, Japanese of A's line]
    ["How are you?", ["I'm fine, thank you.", "I'm ten years old.", "It's Monday.", "Yes, I do."], 0, "元気ですか？"]
  ],
  build: [
    // Sentence building (the app scrambles the words): [Japanese meaning, English sentence]
    ["わたしはねこがすきです。", "I like cats."]
  ],
  read: [
    // Reading comprehension: { title, p: passage, qs: [[question, [4 options], answerIndex], ...] }
    { title: "A Letter from Ken", p: "Hi Emma. ...", qs: [["Where does Ken live?", ["In Tokyo.", "In Osaka.", "In Nara.", "In Kobe."], 0]] }
  ]
};
```

## Rules for `words`
- `english`: lowercase (except the pronoun "I"), no proper nouns, mostly single words; short phrases are OK when they are taught as a unit ("get up", "a lot of", "in front of"). Only letters, spaces, apostrophes, hyphens.
- NO duplicate english entries inside the file. Do not include words that obviously belong to an easier level (the app removes cross-level duplicates automatically, but the fewer the better).
- `japanese`: the ONE main meaning, at most ~12 characters. Two meanings may be joined with "・" ("走る・経営する" only when both are essential).
  - g5 and g4: written for 小学生 (grades 1-6). Use hiragana for kanji beyond about grade-2 level (e.g. "としょかん", "びょういん", "かんたんな"). Simple kanji like 日, 月, 水, 大, 小, 人, 学校, 先生, 車, 犬, 花, 本 are fine.
  - g3, p2, g2: normal Japanese with common kanji is fine (these learners are older).
- `emoji`: give an emoji ONLY when a child would recognise the word from the emoji alone (apple 🍎, dog 🐶, run 🏃, sleep 😴, rain 🌧️, happy 😊, sad 😢, car 🚗, book 📖, hot 🔥, cold 🥶). Abstract/grammar words get "". Prefer a single emoji character; skin-tone/ZWJ sequences are allowed. **Never use the same emoji for two different words in the file** — the picture quiz would become ambiguous; if two words would share one, keep the emoji on the more concrete word and give the other "". Aim for as many emoji words as honestly possible (concrete nouns, animals, food, actions, feelings, weather, places, objects).
- `pos`: one of n, v, adj, adv, prep, pron, conj, int, num, aux, det, other.
- `themeKey`: must match a key in `themes`. Each theme should have 15-24 words. Themes are the "stages" the child plays through in order, so put easier/more concrete themes first, and group words meaningfully (food, animals, school, verbs of daily life, time, weather, adjectives, question words, prepositions ...).

## Rules for `blank` (英検の大問1 style)
- One sentence (or a 2-line mini dialogue "A: ... B: ...") with exactly one `___`.
- 4 options, all distinct, exactly one grammatically/semantically correct. Distractors must be plausible for the level (same word class, similar look/meaning, or the classic grammar confusions such as is/are/am, do/does, go/went/gone).
- Cover BOTH vocabulary and grammar for the level in roughly equal amounts.
- Japanese translation of the full sentence (with the blank filled).

## Rules for `reply` (英検の大問2 / リスニング style)
- A's line is one short everyday utterance (question, greeting, request, statement).
- 4 replies: one appropriate, three that are grammatical but wrong for the situation.
- Keep every line short enough to be read aloud by text-to-speech and understood by a child.

## Rules for `build` (英検の大問3 並べかえ style)
- English sentence of 3-9 words ending with `.`, `?` or `!`. Contractions are fine ("I'm", "don't"). The app will split on spaces, scramble, and add a distractor word.
- Japanese meaning natural and short.

## Rules for `read`
- `p` is a short passage. g4: a notice / e-mail / short letter of 4-5 sentences. g3: 5-7 sentences. p2/g2: 6-9 sentences on a topic teenagers care about. Use `\n` for paragraph breaks if needed.
- 2-3 questions per passage, 4 options each, one correct, distractors taken from details in the passage.

## Validate before you finish
Run `node tools/validate.js js/data/<level>.js <level>` from the project root. Fix every ERROR and try to remove every WARN (especially duplicate emoji). Report the final counts printed by the script.
