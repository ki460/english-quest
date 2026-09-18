/* talk.js — content for はなす（おしゃべり）モード: short coached conversations.
   Each scene: key phrases (also reviewed later as SRS items), a list of turns, homework ideas.
   A turn is asked at whichever rung (むずかしさ) the player is on, so every turn carries all of:
     q      the coach's question (English)
     ja     what it means (shown as support; can be turned off)
     a      model answers, short first ("完成版" shown after the session)
     pick   [pattern with ___, [[word, 意味], ...]] — powers "ふたつから えらぶ" and "ことばを かえて いう"
     yn     [yes answer, no answer] — only when the natural reply is not the derived one
     loose  fixed part that must be said when the rest is the player's own word (name, friend's name...)
   {name} is replaced with the player's name. */
window.ENG_DATA = window.ENG_DATA || {};
window.ENG_DATA.talk = [
  {
    key: "self", name: "じこしょうかい", emoji: "🙋", color: "#FFB03B",
    phrases: [
      ["I'm good, thank you.", "元気です、ありがとう。"],
      ["I like drawing pictures.", "絵をかくのが すきです。"],
      ["I'm nine years old.", "9さいです。"],
      ["I'm from Japan.", "日本から来ました。"],
      ["Nice to meet you, too.", "こちらこそ はじめまして。"]
    ],
    turns: [
      { q: "Hi! How are you?", ja: "やあ！ 元気？", a: ["I'm good, thank you.", "I'm good, thank you. How are you?"],
        pick: ["I'm ___.", [["good", "元気"], ["great", "とても元気"], ["sleepy", "ねむい"], ["hungry", "おなかすいた"], ["okay", "まあまあ"]]] },
      { q: "What's your name?", ja: "名前は なんていうの？", a: ["I'm {name}.", "My name is {name}. Nice to meet you."], loose: ["my name is", "i'm"] },
      { q: "How old are you?", ja: "何さい？", a: ["I'm nine.", "I'm nine years old."],
        pick: ["I'm ___ years old.", [["seven", "7さい"], ["eight", "8さい"], ["nine", "9さい"], ["ten", "10さい"], ["eleven", "11さい"], ["twelve", "12さい"]]] },
      { q: "Where are you from?", ja: "どこから 来たの？", a: ["I'm from Japan.", "I'm from Japan. I live in Tokyo."],
        pick: ["I'm from ___.", [["Japan", "日本"], ["Tokyo", "東京"], ["Osaka", "大阪"], ["Kyoto", "京都"], ["Hokkaido", "北海道"]]] },
      { q: "Do you like sports?", ja: "スポーツは すき？", a: ["Yes, I do.", "Yes, I do. I like soccer."],
        pick: ["I like ___.", [["soccer", "サッカー"], ["swimming", "すいえい"], ["baseball", "やきゅう"], ["dancing", "ダンス"], ["running", "はしること"]]] },
      { q: "What do you like to do?", ja: "なにを するのが すき？", a: ["I like drawing.", "I like drawing pictures."],
        pick: ["I like ___.", [["drawing", "絵をかくこと"], ["reading", "本を読むこと"], ["singing", "うたうこと"], ["cooking", "りょうり"], ["playing games", "ゲーム"]]] },
      { q: "Nice to meet you!", ja: "はじめまして！", a: ["Nice to meet you, too.", "Nice to meet you, too. See you!"] }
    ],
    homework: [
      "かがみの前で \"My name is ___. I'm ___ years old.\" を 3回 いってみよう",
      "おうちの人に えいごで じこしょうかい してみよう（30びょう）",
      "すきなものを \"I like ___.\" で 3つ いってみよう"
    ]
  },
  {
    key: "school", name: "がっこうの こと", emoji: "🏫", color: "#5AA9FF",
    phrases: [
      ["It was fun.", "楽しかったよ。"],
      ["My favorite subject is math.", "すきな教科は 算数です。"],
      ["I have homework today.", "きょうは 宿題があります。"],
      ["I ate curry for lunch.", "おひるに カレーを食べました。"],
      ["My teacher is kind.", "先生は やさしいです。"]
    ],
    turns: [
      { q: "How was school today?", ja: "きょうの 学校は どうだった？", a: ["It was fun.", "It was fun. We had music class."],
        pick: ["It was ___.", [["fun", "楽しかった"], ["great", "さいこう"], ["busy", "いそがしかった"], ["hard", "たいへんだった"], ["okay", "まあまあ"]]] },
      { q: "What's your favorite subject?", ja: "すきな 教科は なに？", a: ["I like math.", "My favorite subject is math."],
        pick: ["My favorite subject is ___.", [["math", "算数"], ["English", "英語"], ["science", "理科"], ["music", "音楽"], ["art", "図工"], ["Japanese", "国語"]]] },
      { q: "Do you have homework today?", ja: "きょう 宿題は ある？", a: ["Yes, I do.", "Yes, I have math homework."],
        pick: ["I have ___ homework.", [["math", "算数"], ["English", "英語"], ["kanji", "漢字"], ["science", "理科"]]] },
      { q: "What did you eat for lunch?", ja: "おひるは 何を食べた？", a: ["I ate curry.", "I ate curry and salad."],
        pick: ["I ate ___.", [["curry", "カレー"], ["bread", "パン"], ["rice", "ごはん"], ["noodles", "めん"], ["fish", "さかな"]]] },
      { q: "Do you like your teacher?", ja: "先生は すき？", a: ["Yes, I do.", "Yes, I do. My teacher is kind."],
        pick: ["My teacher is ___.", [["kind", "やさしい"], ["funny", "おもしろい"], ["nice", "いい先生"], ["cool", "かっこいい"]]] },
      { q: "Who is your best friend?", ja: "いちばんの友だちは だれ？", a: ["My best friend is Aoi.", "My best friend is Aoi. She is kind."], loose: ["my best friend"] },
      { q: "What time do you go to school?", ja: "何時に 学校へ 行く？", a: ["At eight.", "I go to school at eight."],
        pick: ["I go to school at ___.", [["seven thirty", "7時半"], ["eight", "8時"], ["eight fifteen", "8時15分"], ["eight thirty", "8時半"]]] }
    ],
    homework: [
      "きょうの 学校のことを \"It was ___. I ate ___.\" で いってみよう",
      "すきな教科を \"My favorite subject is ___.\" で 3回 いってみよう",
      "おうちの人に えいごで きょうの学校のことを 2文 はなしてみよう"
    ]
  },
  {
    key: "food", name: "たべもの", emoji: "🍎", color: "#22B85B",
    phrases: [
      ["My favorite food is sushi.", "すきな食べものは おすしです。"],
      ["I had rice for breakfast.", "朝ごはんは ごはんでした。"],
      ["I like carrots.", "にんじんが すきです。"],
      ["I can make rice balls.", "おにぎりが作れます。"],
      ["Water, please.", "お水を おねがいします。"]
    ],
    turns: [
      { q: "Are you hungry?", ja: "おなか すいてる？", a: ["Yes, I am.", "Yes, I am. I want a snack."],
        pick: ["I want ___.", [["a snack", "おやつ"], ["rice", "ごはん"], ["bread", "パン"], ["fruit", "くだもの"]]] },
      { q: "What's your favorite food?", ja: "すきな 食べものは なに？", a: ["I like sushi.", "My favorite food is sushi."],
        pick: ["My favorite food is ___.", [["sushi", "おすし"], ["curry", "カレー"], ["pizza", "ピザ"], ["ramen", "ラーメン"], ["ice cream", "アイス"], ["hamburgers", "ハンバーガー"]]] },
      { q: "What did you have for breakfast?", ja: "朝ごはんは 何を食べた？", a: ["I had rice.", "I had rice and miso soup."],
        pick: ["I had ___.", [["rice", "ごはん"], ["bread", "パン"], ["eggs", "たまご"], ["yogurt", "ヨーグルト"], ["cereal", "シリアル"]]] },
      { q: "Do you like vegetables?", ja: "やさいは すき？", a: ["Yes, I do.", "Yes, I do. I like carrots."],
        pick: ["I like ___.", [["carrots", "にんじん"], ["tomatoes", "トマト"], ["corn", "とうもろこし"], ["potatoes", "じゃがいも"], ["broccoli", "ブロッコリー"]]] },
      { q: "Can you cook?", ja: "りょうりは できる？", a: ["Yes, I can.", "Yes, I can make rice balls."],
        pick: ["I can make ___.", [["rice balls", "おにぎり"], ["omelets", "オムレツ"], ["curry", "カレー"], ["salad", "サラダ"]]] },
      { q: "What do you want to drink?", ja: "何が 飲みたい？", a: ["Water, please.", "I want water, please."],
        pick: ["___, please.", [["Water", "お水"], ["Orange juice", "オレンジジュース"], ["Milk", "ぎゅうにゅう"], ["Tea", "おちゃ"]]] },
      { q: "Is Japanese food delicious?", ja: "日本の食べものは おいしい？", a: ["Yes, it is.", "Yes, it is. I love sushi."] }
    ],
    homework: [
      "れいぞうこを あけて、見えた ものを えいごで 3つ いってみよう",
      "ばんごはんの とき \"I like ___. It's delicious.\" と いってみよう",
      "すきな食べものを \"My favorite food is ___.\" で 3回 いってみよう"
    ]
  },
  {
    key: "play", name: "すきなこと・あそび", emoji: "⚽", color: "#8B5CF6",
    phrases: [
      ["I play soccer after school.", "学校のあと サッカーをします。"],
      ["I like swimming. It's fun.", "すいえいが すきです。楽しいよ。"],
      ["Yes, I can. I ride to the park.", "うん、できるよ。こうえんまで のります。"],
      ["I go to the park with my family.", "家族と こうえんに行きます。"],
      ["I'm good at drawing.", "絵をかくのが とくいです。"]
    ],
    turns: [
      { q: "What do you do after school?", ja: "学校のあとは 何をする？", a: ["I play soccer.", "I play soccer with my friends."],
        pick: ["I play ___.", [["soccer", "サッカー"], ["baseball", "やきゅう"], ["the piano", "ピアノ"], ["video games", "ゲーム"], ["outside", "外で"]]] },
      { q: "Do you like video games?", ja: "ゲームは すき？", a: ["Yes, I do.", "Yes, I do. I play every day."] },
      { q: "What sport do you like?", ja: "どんな スポーツが すき？", a: ["I like swimming.", "I like swimming. It's fun."],
        pick: ["I like ___.", [["swimming", "すいえい"], ["soccer", "サッカー"], ["basketball", "バスケ"], ["running", "はしること"], ["skating", "スケート"]]] },
      { q: "Can you ride a bike?", ja: "自転車に のれる？", a: ["Yes, I can.", "Yes, I can. I ride to the park."] },
      { q: "What do you do on weekends?", ja: "週まつは 何をする？", a: ["I go to the park.", "I go to the park with my family."],
        pick: ["I go to ___.", [["the park", "こうえん"], ["the library", "としょかん"], ["the pool", "プール"], ["my grandma's house", "おばあちゃんの家"]]] },
      { q: "Do you watch TV?", ja: "テレビは 見る？", a: ["Yes, I do.", "Yes, I do. I watch anime."],
        pick: ["I watch ___.", [["anime", "アニメ"], ["movies", "えいが"], ["sports", "スポーツ"], ["the news", "ニュース"]]] },
      { q: "What are you good at?", ja: "とくいなことは なに？", a: ["I'm good at drawing.", "I'm good at drawing. I draw every day."],
        pick: ["I'm good at ___.", [["drawing", "絵"], ["running", "はしること"], ["singing", "うた"], ["math", "算数"], ["swimming", "すいえい"]]] }
    ],
    homework: [
      "すきな あそびを \"I like ___. It's fun.\" で いってみよう",
      "きょうの あそびを \"I played ___ today.\" で いってみよう",
      "とくいなことを \"I'm good at ___.\" で 3つ いってみよう"
    ]
  },
  {
    key: "family", name: "かぞく・おうち", emoji: "👨‍👩‍👧", color: "#FF5FA2",
    phrases: [
      ["I have one sister.", "いもうと（おねえさん）が 1人います。"],
      ["I have a dog. His name is Coco.", "犬をかっています。名前は ココです。"],
      ["I wash the dishes.", "おさらを あらいます。"],
      ["I go to bed at nine.", "9時に ねます。"],
      ["We watch movies together.", "いっしょに えいがを見ます。"]
    ],
    turns: [
      { q: "Do you have any brothers or sisters?", ja: "きょうだいは いる？", a: ["Yes, I do.", "Yes, I have one sister."],
        pick: ["I have ___.", [["one sister", "しまい1人"], ["one brother", "きょうだい1人"], ["two brothers", "きょうだい2人"], ["no brothers or sisters", "ひとりっ子"]]] },
      { q: "Do you have a pet?", ja: "ペットは いる？", a: ["Yes, I do.", "Yes, I have a dog."],
        pick: ["I have ___.", [["a dog", "犬"], ["a cat", "ねこ"], ["a fish", "さかな"], ["a rabbit", "うさぎ"], ["a bird", "とり"]]] },
      { q: "Who cooks dinner in your house?", ja: "夕ごはんは だれが作るの？", a: ["My mom does.", "My mom cooks dinner."],
        pick: ["___ cooks dinner.", [["My mom", "お母さん"], ["My dad", "お父さん"], ["My grandma", "おばあちゃん"]]] },
      { q: "Do you help at home?", ja: "おうちの手つだいは する？", a: ["Yes, I do.", "Yes, I wash the dishes."],
        pick: ["I ___.", [["wash the dishes", "おさらをあらう"], ["clean my room", "へやをそうじする"], ["walk the dog", "犬のさんぽ"], ["take out the trash", "ごみを出す"]]] },
      { q: "What time do you go to bed?", ja: "何時に ねる？", a: ["At nine.", "I go to bed at nine."],
        pick: ["I go to bed at ___.", [["eight thirty", "8時半"], ["nine", "9時"], ["nine thirty", "9時半"], ["ten", "10時"]]] },
      { q: "Is your room clean?", ja: "へやは きれい？", a: ["Yes, it is.", "Yes, it is. I clean it every day."] },
      { q: "What do you do with your family?", ja: "家族と 何をする？", a: ["We watch movies.", "We watch movies together."],
        pick: ["We ___ together.", [["watch movies", "えいがを見る"], ["go shopping", "買いものに行く"], ["cook", "りょうりする"], ["play games", "ゲームする"]]] }
    ],
    homework: [
      "家族を えいごで しょうかいしてみよう（\"This is my ___.\"）",
      "おうちの手つだいを したら \"I washed the dishes.\" と いってみよう",
      "ねる前に \"Good night! See you tomorrow.\" と いってみよう"
    ]
  },
  {
    key: "today", name: "きょうの こと", emoji: "🌤️", color: "#3DB8E8",
    phrases: [
      ["I'm happy today.", "きょうは うれしいです。"],
      ["It's sunny and warm.", "はれていて あたたかいです。"],
      ["I played outside with my friends.", "友だちと 外であそびました。"],
      ["Yes, it was fun.", "うん、楽しかった。"],
      ["I'm going to play soccer tomorrow.", "あしたは サッカーをします。"]
    ],
    turns: [
      { q: "How are you today?", ja: "きょうは 元気？", a: ["I'm happy.", "I'm happy today."],
        pick: ["I'm ___.", [["happy", "うれしい"], ["fine", "元気"], ["tired", "つかれた"], ["excited", "わくわく"], ["sleepy", "ねむい"]]] },
      { q: "How's the weather today?", ja: "きょうの 天気は？", a: ["It's sunny.", "It's sunny and warm."],
        pick: ["It's ___.", [["sunny", "はれ"], ["rainy", "雨"], ["cloudy", "くもり"], ["cold", "さむい"], ["hot", "あつい"], ["windy", "かぜが強い"]]] },
      { q: "What did you do today?", ja: "きょうは 何をした？", a: ["I played outside.", "I played outside with my friends."],
        pick: ["I ___ today.", [["played outside", "外であそんだ"], ["studied English", "英語を勉強した"], ["read a book", "本を読んだ"], ["helped my mom", "お母さんを手つだった"]]] },
      { q: "Was it fun?", ja: "楽しかった？", a: ["Yes, it was.", "Yes, it was fun."] },
      { q: "Are you tired?", ja: "つかれてる？", a: ["No, I'm not.", "No, I'm not. I'm fine."] },
      { q: "What are you going to do tomorrow?", ja: "あした 何をする？", a: ["I'm going to play soccer.", "I'm going to play soccer with my friends."],
        pick: ["I'm going to ___.", [["play soccer", "サッカーをする"], ["study", "勉強する"], ["see my friends", "友だちに会う"], ["go shopping", "買いものに行く"]]] },
      { q: "What makes you happy?", ja: "何があると うれしい？", a: ["My dog makes me happy.", "Playing with my friends makes me happy."],
        pick: ["___ makes me happy.", [["My dog", "うちの犬"], ["Music", "音楽"], ["Soccer", "サッカー"], ["My family", "家族"]]] }
    ],
    homework: [
      "ねる前に きょうのことを \"I ___ today. It was fun.\" で いってみよう",
      "まどの外を見て \"It's ___ today.\" と いってみよう",
      "あしたの よていを \"I'm going to ___.\" で いってみよう"
    ]
  },
  {
    key: "friend", name: "ともだちと", emoji: "👭", color: "#FFC531",
    phrases: [
      ["Yes, let's play!", "うん、あそぼう！"],
      ["Let's play tag.", "おにごっこ しよう。"],
      ["Sure, here you are.", "いいよ、はい どうぞ。"],
      ["Thank you! I like it, too.", "ありがとう！ わたしも すき。"],
      ["That's okay. Let's go!", "だいじょうぶだよ。行こう！"]
    ],
    turns: [
      { q: "Do you want to play?", ja: "あそぼうよ？", a: ["Yes, let's play!", "Yes! Let's play soccer."], yn: ["Yes, let's play!", "Sorry, I can't right now."] },
      { q: "What do you want to play?", ja: "何して あそぶ？", a: ["Let's play tag.", "Let's play tag in the park."],
        pick: ["Let's play ___.", [["tag", "おにごっこ"], ["soccer", "サッカー"], ["cards", "トランプ"], ["hide-and-seek", "かくれんぼ"]]] },
      { q: "Can I borrow your pencil?", ja: "えんぴつ かりてもいい？", a: ["Sure, here you are.", "Sure! Here you are."], yn: ["Sure, here you are.", "Sorry, I'm using it."] },
      { q: "I like your bag!", ja: "そのかばん いいね！", a: ["Thank you!", "Thank you! I like it, too."] },
      { q: "Sorry, I'm late.", ja: "ごめん、おくれちゃった。", a: ["That's okay.", "That's okay. Let's go!"] },
      { q: "Do you want to come to my house?", ja: "うちに 来ない？", a: ["Yes, I'd love to.", "Yes! What time?"], yn: ["Yes, I'd love to.", "Sorry, I can't today."] },
      { q: "See you tomorrow!", ja: "また あした！", a: ["See you!", "See you tomorrow! Bye!"] }
    ],
    homework: [
      "友だちに \"Let's play ___!\" と さそう れんしゅうを 3回",
      "だれかに \"Thank you!\" と \"You're welcome.\" を いってみよう",
      "かぞくに \"I like your ___!\" と ほめてみよう"
    ]
  },
  {
    key: "trip", name: "おでかけ・たび", emoji: "🧳", color: "#14B8A6",
    phrases: [
      ["I want to go to Hawaii.", "ハワイに 行きたいです。"],
      ["A hamburger, please.", "ハンバーガーを おねがいします。"],
      ["How much is this?", "これは いくらですか？"],
      ["I'm going to the station.", "えきに 行きます。"],
      ["Yes, please. I'm lost.", "はい、おねがいします。道に まよいました。"]
    ],
    turns: [
      { q: "Where do you want to go?", ja: "どこに 行きたい？", a: ["I want to go to Hawaii.", "I want to go to Hawaii with my family."],
        pick: ["I want to go to ___.", [["Hawaii", "ハワイ"], ["America", "アメリカ"], ["Australia", "オーストラリア"], ["the beach", "うみ"], ["the zoo", "どうぶつえん"]]] },
      { q: "Do you like traveling?", ja: "旅行は すき？", a: ["Yes, I do.", "Yes, I do. I like airplanes."] },
      { q: "What would you like?", ja: "ご注文は 何に しますか？", a: ["A hamburger, please.", "A hamburger and orange juice, please."],
        pick: ["___, please.", [["A hamburger", "ハンバーガー"], ["Pizza", "ピザ"], ["Ice cream", "アイス"], ["A salad", "サラダ"]]] },
      { q: "Can I help you?", ja: "何か おさがしですか？", a: ["Yes, please.", "Yes, please. How much is this?"] },
      { q: "Where are you going?", ja: "どこへ 行くの？", a: ["I'm going to the station.", "I'm going to the station. Where is it?"],
        pick: ["I'm going to ___.", [["the station", "えき"], ["the hotel", "ホテル"], ["the museum", "はくぶつかん"], ["the park", "こうえん"]]] },
      { q: "Do you need help?", ja: "手つだいましょうか？", a: ["Yes, please.", "Yes, please. I'm lost."], yn: ["Yes, please.", "No, thank you. I'm fine."] },
      { q: "Have a nice trip!", ja: "よい旅を！", a: ["Thank you!", "Thank you! You too!"] }
    ],
    homework: [
      "行きたい国を \"I want to go to ___.\" で 3つ いってみよう",
      "おみせごっこで \"___, please.\" と ちゅうもんしてみよう",
      "「たびの じゅんび」の フレーズを 5つ 声に出してみよう"
    ]
  }
];
