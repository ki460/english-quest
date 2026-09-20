/* phonics.js — sound patterns: groups of [word, japanese, emoji]; every word has a picture.
   `hl` is a regex for the letters that make the group's sound: they are coloured on the word card and the picture question. */
window.ENG_DATA = window.ENG_DATA || {};
window.ENG_DATA.phonics = [
  { key: "a", name: "みじかい a", emoji: "🐱", hint: "a は「ア」", hl: "a", words: [
    ["cat", "ねこ", "🐱"], ["hat", "ぼうし", "🎩"], ["bat", "コウモリ", "🦇"], ["bag", "かばん", "👜"], ["map", "ちず", "🗺️"], ["fan", "せんぷうき", "🪭"], ["jam", "ジャム", "🫙"], ["pan", "フライパン", "🍳"], ["ham", "ハム", "🍖"], ["rat", "ねずみ", "🐀"]
  ]},
  { key: "e", name: "みじかい e", emoji: "🛏️", hint: "e は「エ」", hl: "e", words: [
    ["bed", "ベッド", "🛏️"], ["pen", "ペン", "🖊️"], ["pet", "ペット", "🐹"], ["net", "あみ", "🥅"], ["ten", "10", "🔟"], ["red", "あか", "🟥"], ["leg", "あし", "🦵"], ["jet", "ジェットき", "✈️"], ["wet", "ぬれた", "💦"], ["egg", "たまご", "🥚"]
  ]},
  { key: "i", name: "みじかい i", emoji: "🐷", hint: "i は「イ」", hl: "i", words: [
    ["pig", "ぶた", "🐷"], ["six", "6", "6️⃣"], ["lip", "くちびる", "👄"], ["sit", "すわる", "🪑"], ["big", "おおきい", "🐘"], ["win", "かつ", "🏆"], ["pin", "ピン", "📌"], ["dig", "ほる", "⛏️"], ["fix", "なおす", "🔧"], ["kid", "こども", "🧒"]
  ]},
  { key: "o", name: "みじかい o", emoji: "🐶", hint: "o は「オ」", hl: "o", words: [
    ["dog", "いぬ", "🐶"], ["hot", "あつい", "🥵"], ["box", "はこ", "📦"], ["fox", "きつね", "🦊"], ["pot", "なべ", "🍲"], ["mom", "ママ", "👩"], ["sock", "くつした", "🧦"], ["hop", "ぴょんと とぶ", "🐇"], ["jog", "ジョギング", "🏃"], ["rock", "いわ", "🪨"]
  ]},
  { key: "u", name: "みじかい u", emoji: "☀️", hint: "u は「ア」に ちかい おと", hl: "u", words: [
    ["sun", "たいよう", "☀️"], ["cup", "コップ", "🥤"], ["bus", "バス", "🚌"], ["bug", "むし", "🐛"], ["duck", "あひる", "🦆"], ["run", "はしる", "🏃"], ["nut", "ナッツ", "🥜"], ["hug", "ぎゅっと だきしめる", "🤗"], ["cut", "きる", "✂️"], ["fun", "たのしい", "🎉"]
  ]},
  { key: "sh", name: "sh・ch・th", emoji: "🧀", hint: "sh「シュ」 ch「チ」 th「ス」", hl: "sh|ch|th", words: [
    ["shop", "みせ", "🏪"], ["sheep", "ひつじ", "🐑"], ["fish", "さかな", "🐟"], ["ship", "ふね", "🚢"], ["chair", "いす", "🪑"], ["cheese", "チーズ", "🧀"], ["chick", "ひよこ", "🐥"], ["bath", "おふろ", "🛁"], ["three", "3", "3️⃣"], ["thumb", "おやゆび", "👍"]
  ]},
  { key: "e_", name: "まほうの e", emoji: "🎂", hint: "さいごの e で まえの ぼいんが なまえよみに", hl: "[aeiou](?=[^aeiou]e$)|e$", words: [
    ["cake", "ケーキ", "🎂"], ["name", "なまえ", "🏷️"], ["bike", "じてんしゃ", "🚲"], ["kite", "たこ（あげる）", "🪁"], ["home", "いえ", "🏠"], ["nose", "はな", "👃"], ["cube", "さいころ", "🎲"], ["rose", "バラ", "🌹"], ["whale", "くじら", "🐳"], ["snake", "へび", "🐍"]
  ]},
  { key: "vv", name: "ぼいんの なかま", emoji: "🌧️", hint: "ai ay ee ea oa ow oo", hl: "ai|ay|ee|ea|oa|ow|oo", words: [
    ["rain", "あめ", "🌧️"], ["train", "でんしゃ", "🚆"], ["tree", "き", "🌳"], ["bee", "はち", "🐝"], ["sea", "うみ", "🌊"], ["boat", "ボート", "⛵"], ["snow", "ゆき", "❄️"], ["moon", "つき", "🌙"], ["book", "ほん", "📖"], ["day", "ひ・ひるま", "🌞"]
  ]},
  { key: "bl", name: "くっつく しいん", emoji: "⭐", hint: "fr fl st cr dr pl bl", hl: "^(fr|fl|st|cr|dr|pl|bl|gr|br|sp|sn)", words: [
    ["flag", "はた", "🚩"], ["star", "ほし", "⭐"], ["crab", "かに", "🦀"], ["plane", "ひこうき", "🛩️"], ["black", "くろ", "⬛"], ["green", "みどり", "🟩"], ["bread", "パン", "🍞"], ["flower", "はな（しょくぶつ）", "🌸"], ["spoon", "スプーン", "🥄"], ["stop", "とまれ", "🛑"]
  ]}
];
