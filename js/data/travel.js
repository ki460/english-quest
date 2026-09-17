/* travel.js — phrases for the trip abroad. Each scene: phrases [english, japanese], dialogs [what the other person says, [4 replies], answerIndex, japanese], missions (things to try for real) */
window.ENG_DATA = window.ENG_DATA || {};
window.ENG_DATA.travel = [
  {
    key: "greet", name: "あいさつ・ともだち", emoji: "👋", color: "#FFB03B",
    phrases: [
      ["Hello!", "こんにちは！"],
      ["Hi, nice to meet you.", "はじめまして。"],
      ["I'm from Japan.", "日本から来ました。"],
      ["How are you?", "元気？"],
      ["I'm good, thank you.", "元気です、ありがとう。"],
      ["I'm ten years old.", "10さいです。"],
      ["Thank you very much.", "どうもありがとう。"],
      ["You're welcome.", "どういたしまして。"],
      ["Excuse me.", "すみません。（よびかけ）"],
      ["I'm sorry.", "ごめんなさい。"],
      ["Yes, please.", "はい、おねがいします。"],
      ["No, thank you.", "いいえ、けっこうです。"],
      ["See you!", "またね！"],
      ["Have a nice day!", "よい一日を！"]
    ],
    dialogs: [
      ["Hi! What's your name?", ["I'm Yuki.", "I'm fine.", "I'm ten.", "It's sunny."], 0, "やあ！名前は？"],
      ["Where are you from?", ["I'm from Japan.", "I'm nine years old.", "I like sushi.", "It's over there."], 0, "どこから来たの？"],
      ["How old are you?", ["I'm eight.", "I'm from Osaka.", "I'm hungry.", "At eight."], 0, "何さい？"],
      ["Nice to meet you.", ["Nice to meet you, too.", "You're welcome.", "See you.", "Yes, please."], 0, "はじめまして。"],
      ["Thank you!", ["You're welcome.", "Thank you.", "I'm sorry.", "Excuse me."], 0, "ありがとう！"],
      ["Do you like soccer?", ["Yes, I do!", "Yes, I am.", "I'm ten.", "It's blue."], 0, "サッカーすき？"],
      ["Have a nice day!", ["You too!", "I'm from Japan.", "No, thank you.", "It's mine."], 0, "よい一日を！"]
    ],
    missions: ["お店の人に Hello! と言う", "Thank you. と言う", "はじめての人に I'm from Japan. と言う", "How are you? と聞いてみる"]
  },
  {
    key: "airport", name: "くうこう・ひこうき", emoji: "✈️", color: "#5AA9FF",
    phrases: [
      ["Here is my passport.", "パスポートです。"],
      ["Sightseeing.", "かんこうです。（入国のとき）"],
      ["Five days.", "5日間です。"],
      ["Where is gate twelve?", "12番ゲートはどこですか？"],
      ["Window seat, please.", "まどがわの席をおねがいします。"],
      ["Can I have some water?", "お水をもらえますか？"],
      ["Chicken, please.", "チキンをおねがいします。"],
      ["Where is the bathroom?", "トイレはどこですか？"],
      ["Can I have a blanket?", "もうふをもらえますか？"],
      ["I'm with my family.", "家族といっしょです。"],
      ["Which way is the exit?", "出口はどっちですか？"],
      ["This is my bag.", "これはわたしのバッグです。"]
    ],
    dialogs: [
      ["What's the purpose of your visit?", ["Sightseeing.", "Five days.", "Yes, please.", "I'm ten."], 0, "たいざいの目的は？"],
      ["How long will you stay?", ["Five days.", "Sightseeing.", "By plane.", "I'm from Japan."], 0, "どのくらい たいざいしますか？"],
      ["Chicken or beef?", ["Chicken, please.", "Yes, please.", "Window, please.", "Here you are."], 0, "チキンとビーフ、どちらにしますか？"],
      ["Would you like something to drink?", ["Orange juice, please.", "I'm sightseeing.", "It's a bag.", "Gate twelve."], 0, "お飲みものはいかがですか？"],
      ["Your passport, please.", ["Here you are.", "You're welcome.", "See you.", "It's mine, too."], 0, "パスポートをおねがいします。"],
      ["Window or aisle?", ["Window, please.", "Chicken, please.", "Five days.", "Thank you."], 0, "まどがわと通路がわ、どちら？"]
    ],
    missions: ["ひこうきで Can I have some water? と言う", "きにゅうカウンターで Sightseeing. と答える", "Where is the bathroom? と聞く"]
  },
  {
    key: "hotel", name: "ホテル", emoji: "🏨", color: "#B07CFF",
    phrases: [
      ["Check in, please.", "チェックインをおねがいします。"],
      ["What time is breakfast?", "朝ごはんは何時ですか？"],
      ["Where is the pool?", "プールはどこですか？"],
      ["Can I have the Wi-Fi password?", "Wi-Fiのパスワードをもらえますか？"],
      ["Can I have another towel?", "タオルをもう一まいもらえますか？"],
      ["The key doesn't work.", "かぎが あきません。"],
      ["What floor is my room?", "わたしのへやは何かいですか？"],
      ["Good morning!", "おはようございます！"],
      ["Good night!", "おやすみなさい！"],
      ["Can you call a taxi?", "タクシーをよんでもらえますか？"]
    ],
    dialogs: [
      ["Good morning! How can I help you?", ["What time is breakfast?", "I'm ten.", "Chicken, please.", "See you!"], 0, "おはようございます！ご用件は？"],
      ["Breakfast is from seven to ten.", ["Thank you.", "Five days.", "I'm sorry.", "No, thank you."], 0, "朝食は7時から10時です。"],
      ["Do you need anything else?", ["Another towel, please.", "Yes, I am.", "It's on the fifth floor.", "Nice to meet you."], 0, "ほかに何かいりますか？"],
      ["Your room is on the fifth floor.", ["Thank you very much.", "Chicken, please.", "I'm from Japan.", "How are you?"], 0, "おへやは5かいです。"],
      ["The pool is open until nine.", ["Great, thank you!", "Five days.", "Here is my passport.", "I'm sorry."], 0, "プールは9時まで開いています。"]
    ],
    missions: ["フロントで Good morning! と言う", "What time is breakfast? と聞く", "Can I have another towel? とおねがいする"]
  },
  {
    key: "food", name: "レストラン・カフェ", emoji: "🍔", color: "#FF6B6B",
    phrases: [
      ["A table for four, please.", "4人ですが、席をおねがいします。"],
      ["Can I see the menu?", "メニューを見せてもらえますか？"],
      ["I'd like a hamburger, please.", "ハンバーガーをおねがいします。"],
      ["Can I have orange juice?", "オレンジジュースをもらえますか？"],
      ["Not spicy, please.", "からくしないでください。"],
      ["What do you recommend?", "おすすめは何ですか？"],
      ["Can I have some ketchup?", "ケチャップをもらえますか？"],
      ["This is delicious!", "これ、おいしい！"],
      ["Check, please.", "おかいけいをおねがいします。"],
      ["Can I have a small ice cream?", "小さいアイスクリームをおねがいします。"],
      ["One chocolate, please.", "チョコレートを1つおねがいします。"],
      ["For here, please.", "ここで食べます。"],
      ["To go, please.", "もちかえりで。"]
    ],
    dialogs: [
      ["Are you ready to order?", ["Yes. A hamburger, please.", "Yes, I am ten.", "For five days.", "Nice to meet you."], 0, "ご注文はお決まりですか？"],
      ["Anything to drink?", ["Orange juice, please.", "Not spicy, please.", "Check, please.", "I'm full."], 0, "お飲みものは？"],
      ["For here or to go?", ["For here, please.", "Chicken, please.", "Window, please.", "Yes, I do."], 0, "ここで食べますか、もちかえりですか？"],
      ["How is everything?", ["It's delicious!", "It's Monday.", "It's five dollars.", "I'm from Japan."], 0, "お味はいかがですか？"],
      ["Would you like dessert?", ["Ice cream, please.", "Check, please.", "Sightseeing.", "To go, please."], 0, "デザートはいかがですか？"],
      ["Here is your change.", ["Thank you!", "Not spicy, please.", "A table for four.", "I'd like a hamburger."], 0, "おつりです。"]
    ],
    missions: ["自分で I'd like ... please. と注文する", "Can I have ...? と何かたのむ", "食べたあと This is delicious! と言う", "Check, please. と言ってみる"]
  },
  {
    key: "shop", name: "かいもの", emoji: "🛍️", color: "#FF8FC8",
    phrases: [
      ["How much is this?", "これはいくらですか？"],
      ["Can I try it on?", "しちゃくしてもいいですか？"],
      ["Do you have a smaller one?", "もっと小さいのはありますか？"],
      ["Do you have this in blue?", "これの青はありますか？"],
      ["I'll take it.", "これにします。"],
      ["Can I pay by card?", "カードではらえますか？"],
      ["Just looking, thank you.", "見ているだけです、ありがとう。"],
      ["Can I have a bag?", "ふくろをもらえますか？"],
      ["Where are the toys?", "おもちゃはどこですか？"],
      ["I'm looking for a T-shirt.", "Tシャツをさがしています。"],
      ["That's too expensive.", "高すぎます。"],
      ["Thank you, goodbye!", "ありがとう、さようなら！"]
    ],
    dialogs: [
      ["Can I help you?", ["I'm looking for a T-shirt.", "I'm ten years old.", "Yes, I am.", "Check, please."], 0, "何かおさがしですか？"],
      ["It's twelve dollars.", ["I'll take it.", "Five days.", "Nice to meet you.", "It's mine."], 0, "12ドルです。"],
      ["Cash or card?", ["Card, please.", "Chicken, please.", "Small, please.", "Yes, I do."], 0, "げんきんとカード、どちらですか？"],
      ["Do you need a bag?", ["Yes, please.", "I'm sorry.", "How much?", "Blue, please."], 0, "ふくろはいりますか？"],
      ["What size do you need?", ["Small, please.", "Card, please.", "Two, please.", "See you."], 0, "サイズはどれにしますか？"],
      ["Thank you. Have a nice day!", ["You too. Bye!", "Yes, please.", "I'll take it.", "How much is this?"], 0, "ありがとうございました。よい一日を！"]
    ],
    missions: ["How much is this? と聞く", "自分で I'll take it. と言って買う", "Do you have ...? と聞いてみる"]
  },
  {
    key: "way", name: "みちをきく・のりもの", emoji: "🗺️", color: "#4ED2A5",
    phrases: [
      ["Excuse me, where is the station?", "すみません、駅はどこですか？"],
      ["How do I get to the beach?", "ビーチへはどう行けばいいですか？"],
      ["Is it far from here?", "ここから遠いですか？"],
      ["Can you show me on the map?", "地図で教えてもらえますか？"],
      ["Turn left.", "左にまがって。"],
      ["Turn right.", "右にまがって。"],
      ["Go straight.", "まっすぐ行って。"],
      ["It's next to the bank.", "銀行のとなりです。"],
      ["One ticket to the zoo, please.", "動物園まで1まい おねがいします。"],
      ["Does this bus go to the museum?", "このバスは はくぶつかんに行きますか？"],
      ["Thank you for your help!", "たすけてくれてありがとう！"],
      ["I'm lost.", "道にまよいました。"]
    ],
    dialogs: [
      ["Excuse me, where is the museum?", ["Go straight and turn left.", "It's five dollars.", "I'm from Japan.", "Yes, I do."], 0, "すみません、はくぶつかんはどこですか？"],
      ["Is it far?", ["No, it's about five minutes.", "No, thank you.", "It's a museum.", "I'm lost."], 0, "遠いですか？"],
      ["Does this bus go to the beach?", ["Yes, it does.", "Yes, I am.", "Turn right.", "For here."], 0, "このバスはビーチへ行きますか？"],
      ["Which way is the station?", ["It's that way.", "It's ten o'clock.", "It's delicious.", "It's twelve dollars."], 0, "駅はどっちですか？"],
      ["You're welcome. Have a good trip!", ["Thank you!", "Go straight.", "Turn left.", "Small, please."], 0, "どういたしまして。よい旅を！"]
    ],
    missions: ["Excuse me, where is ...? と聞く", "Thank you for your help! と言う", "きっぷを自分で買ってみる"]
  },
  {
    key: "fun", name: "あそび・かんこう", emoji: "🎢", color: "#FFC531",
    phrases: [
      ["One ticket, please.", "チケットを1まい おねがいします。"],
      ["Two children and two adults.", "こども2人と大人2人です。"],
      ["Can you take a picture, please?", "写真をとってもらえますか？"],
      ["Where is the line for the roller coaster?", "ジェットコースターの列はどこですか？"],
      ["What time does it open?", "何時に開きますか？"],
      ["What time does it close?", "何時にしまりますか？"],
      ["This is so fun!", "これ、すっごく楽しい！"],
      ["I want to try this.", "これをやってみたい。"],
      ["Can I touch it?", "さわってもいいですか？"],
      ["Can I feed the animals?", "動物にえさをあげてもいいですか？"],
      ["Let's go!", "行こう！"],
      ["Wow, look at that!", "わあ、あれを見て！"]
    ],
    dialogs: [
      ["How many tickets?", ["Two, please.", "Two o'clock.", "Yes, please.", "Turn left."], 0, "チケットは何まい？"],
      ["Say cheese!", ["Cheese!", "Chicken!", "Thank you!", "Sorry!"], 0, "はい、チーズ！"],
      ["Do you want to ride again?", ["Yes! Let's go!", "Yes, I am.", "It's far.", "Check, please."], 0, "もう一回のる？"],
      ["It opens at nine.", ["Thank you.", "Two, please.", "I'm lost.", "For here."], 0, "9時に開きます。"],
      ["Did you have fun?", ["Yes, it was so fun!", "Yes, I'm ten.", "No, thank you.", "It's next to the bank."], 0, "楽しかった？"]
    ],
    missions: ["Can you take a picture, please? とたのむ", "This is so fun! と言う", "One ticket, please. と自分で買う"]
  },
  {
    key: "help", name: "こまったとき", emoji: "🆘", color: "#FF7A1A",
    phrases: [
      ["Help!", "たすけて！"],
      ["I'm lost.", "まいごです。"],
      ["I can't find my mother.", "お母さんが見つかりません。"],
      ["I don't feel well.", "気分がわるいです。"],
      ["I have a stomachache.", "おなかがいたいです。"],
      ["Can you speak slowly, please?", "ゆっくり話してもらえますか？"],
      ["Can you say that again?", "もう一回言ってもらえますか？"],
      ["I don't understand.", "わかりません。"],
      ["Please call my parents.", "親によんでください。"],
      ["I lost my bag.", "バッグをなくしました。"],
      ["Where is the hospital?", "病院はどこですか？"],
      ["It's okay. Thank you.", "だいじょうぶです。ありがとう。"]
    ],
    dialogs: [
      ["Are you okay?", ["I don't feel well.", "Chicken, please.", "I'll take it.", "Five days."], 0, "だいじょうぶ？"],
      ["Where are your parents?", ["I don't know. I'm lost.", "I'm from Japan.", "It's ten dollars.", "Turn right."], 0, "ご両親はどこ？"],
      ["What's your name?", ["My name is Ken.", "I'm nine.", "It's okay.", "Here you are."], 0, "名前は？"],
      ["Do you understand?", ["Sorry, can you say that again?", "Yes, please.", "It's delicious.", "For here."], 0, "わかりますか？"],
      ["What happened?", ["I lost my bag.", "I'm ten years old.", "See you!", "Small, please."], 0, "どうしたの？"]
    ],
    missions: ["Can you say that again? と言ってみる", "まいごになったら大人に I'm lost. と言う（練習しておこう）"]
  }
];
