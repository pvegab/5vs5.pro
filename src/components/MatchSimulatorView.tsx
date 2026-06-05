import React, { useState, useEffect, useRef } from 'react';
import { TeamDraft, HistoricalTeam, MatchEvent, MatchSimulator, Region, Player } from '../types';
import { Trophy, Shield, Play, RotateCcw, Swords, Compass, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { Language, TRANSLATIONS, getLocalizedRoundName } from '../locales';
import { playVictorySound, playDefeatSound } from '../utils/audio';

interface MatchSimulatorViewProps {
  draft: TeamDraft;
  opponentTeamsList: HistoricalTeam[];
  currentRound: number; // 0 to 5 (6 rounds total)
  teamScore: number;
  synergyDetails: {
    regionBonus: number;
    teamBonus: number;
    yearBonus: number;
    champBonus?: number;
    coachBonus?: number;
    activeSynergies?: string[];
    total: number;
  };
  onRoundComplete: (
    success: boolean,
    opponent?: HistoricalTeam,
    performance?: { kills: number; deaths: number }
  ) => void;
  onResetTournament: (fullReset: boolean) => void;
  gameMode?: 'normal' | 'lecHard';
  lang?: Language;
}

// Compact Multilingual Live Commentary Engine
// Provides contextual translations for match events
const EVENT_TRANSLATIONS: Record<Language, {
  s1: string[];
  s2: string[];
  s3: string[];
  s4: string[];
  s5: string[];
  s6Win: string[];
  s6Loss: string[];
  s7Win: string[];
  s7Loss: string[];
}> = {
  es: {
    s1: [
      "¡Invasión agresiva al nivel 1! {dSup} toma la iniciativa con un destello para invadir la jungla.",
      "Bajo la directriz estratégica del Coach {dCoach}, plantean una rotación impecable para defender.",
      "{dJungle} coloca centinelas profundos rastreando la ruta inicial de {oJungle}."
    ],
    s2: [
      "¡PRIMERA SANGRE! {dJungle} saca provecho de {dJungleChamp} y embosca con éxito a {oMid}.",
      "¡ASESINATO INDIVIDUAL! Con reflejos sobrehumanos, {dTop} castiga a {oTop} en línea.",
      "¡Doble baja en carril inferior! {dAdc} y {dSup} sincronizan combos letales."
    ],
    s3: [
      "Tu equipo asegura las Larvas del Vacío acelerando el empuje sobre las torres.",
      "{dJungle} se hace con el control del Dragón del Océano sin contratiempos.",
      "{dTop} teleporta para castigar una rotación imprudente de {oppName}."
    ],
    s4: [
      "¡Guerra en el Heraldo de la Grieta! {dTop} desata control de masas decisivo.",
      "{dMid} desata ráfagas devastadoras con {dMidChamp} barriendo al rival.",
      "La botlane sella un atrapamiento providencial facilitando la caída de la torre enemiga."
    ],
    s5: [
      "Asedio intenso y baile visual alrededor de Barón Nashor liderado por {dCoach}.",
      "¡Micro-mecánica estelar! El tirador {dAdc} esquiva limpiamente los misiles enemigos.",
      "La presión paralela ejercida por {dTop} obliga a {oppName} a dividirse en desorden."
    ],
    s6Win: [
      "¡ROBO LEGENDARIO! El jungla {dJungle} se desliza hacia el foso y asegura el Barón Nashor.",
      "Cebo maestro en el dragón. {dAdc} activa combos aniquilando a la patrulla enemiga."
    ],
    s6Loss: [
      "¡Tragedia! El jungla rival {oJungle} asegura el Nashor desmantelando la zona.",
      "Rodeados y diezmados en el foso del dragón. {oMid} asesta la estocada definitiva."
    ],
    s7Win: [
      "¡SENSACIONAL EXTERMINIO! {dMid} con {dMidChamp} colapsa a cuatro rivales. ¡La gloria está cerca!",
      "¡QUADRA KILL para {dAdc}! Recibiendo un peel celestial de {dSup}, borra de la grieta a {oppName}."
    ],
    s7Loss: [
      "¡Colapso total! {oMid} encuentra un flanco perfecto destrozando la retaguardia de tu squad.",
      "Cazados en la maleza oscura. Tu tirador {dAdc} cae fulminado antes de reaccionar."
    ]
  },
  en: {
    s1: [
      "Aggressive Level 1 invasion! {dSup} flashes forward initiating a deep jungle skirmish.",
      "Under Coach {dCoach}'s meticulous strategical blueprint, your team maps out a perfect defense.",
      "{dJungle} drops deep wards deciphering the early game pathing of {oJungle}."
    ],
    s2: [
      "FIRST BLOOD! {dJungle} pilotting {dJungleChamp} pulls off a stellar gank to execute {oMid}.",
      "SOLO KILL! Showing elite micro reflexes, {dTop} completely humbles {oTop} in the top lane.",
      "Double kill in the bot lane! {dAdc} and {dSup} establish complete lane dominance."
    ],
    s3: [
      "Your team captures Void Grubs, drastically accelerating tower pressure.",
      "{dJungle} secures Ocean Dragon with ease, utilizing lane priority.",
      "{dTop} teleports bot side to punish an overextension by {oppName}."
    ],
    s4: [
      "Rift Herald Teamfight! {dTop} delivers a crucial crowd control combo on {oTop}.",
      "{dMid} unleashes massive damage output with {dMidChamp}, disarming the opponent.",
      "The botlane secures a swift catch on {oAdc}, opening pathing to take tier 1 tower."
    ],
    s5: [
      "High stakes tactical dance around Baron Nashor pits Coach {dCoach} against opposing intellect.",
      "Stellar spacing! ADC {dAdc} dodges consecutive skillshots using micro mechanics.",
      "Splitting pressure from {dTop} forces {oppName} to pivot, fracturing their formation."
    ],
    s6Win: [
      "LEGENDARY BARON STEAL! Jungler {dJungle} slides in with an immaculate smite!",
      "Perfect Baron bait. {dAdc} and the squad collapse on {oppName} wiping out their front line."
    ],
    s6Loss: [
      "Disaster! Opposing jungler {oJungle} secures Baron Nashor, putting your squad in check.",
      "Trapped in the pit, a devastating combination from {oMid} breaks through your defensive line."
    ],
    s7Win: [
      "SENSATIONAL ACE! {dMid} lands a monumental ultimate with {dMidChamp}. Victory is imminent!",
      "QUADRA KILL FOR {dAdc}! Supported by {dSup}'s perfect peeling, wiping {oppName} off the map."
    ],
    s7Loss: [
      "Defensive line breached! Opposing carries find an angle and dismantle your backline.",
      "Ambushed in the dark bush. {dAdc} is deleted before entering the decisive skirmish."
    ]
  },
  fr: {
    s1: [
      "Invasion agressive au niveau 1 ! {dSup} utilise Saut Éclair pour initier le combat.",
      "Sous les directives tactiques de Coach {dCoach}, l'équipe déploie une défense parfaite.",
      "{dJungle} pose des balises profondes pour décoder le parcours de {oJungle}."
    ],
    s2: [
      "PREMIER SANG ! {dJungle} avec {dJungleChamp} surprend et élimine {oMid}.",
      "SOLO KILL ! Grâce à des réflexes divins, {dTop} domine {oTop} sur la voie du haut.",
      "Double élimination en botlane ! {dAdc} et {dSup} détruisent le duo adverse."
    ],
    s3: [
      "Votre équipe sécurise les larves du Néant pour accélérer la pression de poussée.",
      "{dJungle} capture le Dragon des Océans sans contestation.",
      "{dTop} utilise sa téléportation pour punir une rotation de {oppName}."
    ],
    s4: [
      "Combat autour de l'Héraut de la Faille ! {dTop} applique un contrôle de foule massif.",
      "{dMid} inflige d'énormes dégâts magiques avec {dMidChamp} pour disperser l'ennemi.",
      "La botlane attrape {oAdc} et s'empare de la première tourelle."
    ],
    s5: [
      "Pression et danse stratégique autour du Baron Nashor motivées par coach {dCoach}.",
      "Esquive fantastique ! {dAdc} démontre une micro-performance irréprochable.",
      "La pression latérale de {dTop} force {oppName} à se diviser en désordre."
    ],
    s6Win: [
      "VOL DE BARON HISTORIQUE ! Le jungler {dJungle} plonge et sécurise l'objectif à la dernière seconde !",
      "Appât parfait sur le Baron. {dAdc} élimine la patrouille ennemi."
    ],
    s6Loss: [
      "Catastrophe ! Le jungler adverse {oJungle} s'empare du Baron Nashor.",
      "Coincé dans la fosse, un combo combiné de {oMid} anéantit nos espoirs."
    ],
    s7Win: [
      "SENSATIONNEL ACE ! {dMid} réussit un ultime dévastateur avec {dMidChamp}. C'est la victoire !",
      "QUADRA KILL POUR {dAdc} ! Protégé par {dSup}, il décime toute l'équipe {oppName}."
    ],
    s7Loss: [
      "L'ennemi brise notre défense ! {oMid} s'infiltre et décime notre ligne arrière.",
      "Embuscade mortelle. {dAdc} est éliminé instantanément sans pouvoir réagir."
    ]
  },
  de: {
    s1: [
      "Aggressive Invasion auf Stufe 1! {dSup} blitzt vor und zwingt den Gegner zum Rückzug.",
      "Unter der strategischen Anleitung von Coach {dCoach} steht die Verteidigung bombensicher.",
      "{dJungle} platziert tiefe Wards, um {oJungle}s Pfad im gegnerischen Dschungel aufzudecken."
    ],
    s2: [
      "FIRST BLOOD! {dJungle} gankt auf {dJungleChamp} meisterhaft und eliminiert {oMid}.",
      "SOLO KILL! Mit überragenden Reflexen bezwingt {dTop} seinen Gegner {oTop} im 1v1.",
      "Doppelpack im Botlane-Duell! {dAdc} und {dSup} dominieren komplett."
    ],
    s3: [
      "Ihr Team sichert sich die Leerenmaden und reißt feindliche Türme im Nu ein.",
      "Dschungler {dJungle} beansprucht den Ozeandrachen ohne Gegenwehr.",
      "{dTop} teleportiert sich nach unten, um einen Fehler von {oppName} eiskalt zu bestrafen."
    ],
    s4: [
      "Kampf um den Herold! {dTop} setzt eine entscheidende Massenkontrolle auf {oTop} an.",
      "{dMid} entfesselt mit {dMidChamp} massiven Schaden und zerschlägt die feindlichen Reihen.",
      "Perfekter Catch auf {oAdc} führt zum sicheren Einsturz des ersten gegnerischen Turms."
    ],
    s5: [
      "Ein nervenaufreibendes taktisches Duell um Baron Nashor fordert Coach {dCoach} heraus.",
      "Geniales Spacing! {dAdc} weicht mit überragender Mikromechanik allen Angriffen aus.",
      "Der Splitpush von {dTop} reißt die Verteidigung von {oppName} komplett auseinander."
    ],
    s6Win: [
      "LEGENDÄRER BARON-STEAL! {dJungle} springt todesmutig im letzten Moment rein!",
      "Hinterhalt am Baron geglückt. {dAdc} fegt den Gegner vom Feld."
    ],
    s6Loss: [
      "Katastrophe! Der feindliche Dschungler {oJungle} stiehlt Baron Nashor.",
      "In der Baron-Grube eingekesselt, zerlegt {oMid} die Hoffnung des gesamten Teams."
    ],
    s7Win: [
      "SENSATIONELLES ACE! {dMid} landet die ultimative Fähigkeit mit {dMidChamp}. Der Sieg ist da!",
      "QUADRA KILL FÜR {dAdc}! Perfekter Schutz von {dSup} sichert die Zerstörung des Gegners."
    ],
    s7Loss: [
      "Einbruch der Verteidigung! {oMid} flankiert genial und löscht das Team aus.",
      "Im Gebüsch kalt erwischt. {dAdc} stirbt, bevor der Teamkampf überhaupt beginnt."
    ]
  },
  it: {
    s1: [
      "Invasione aggressiva al Livello 1! {dSup} usa Flash e lancia l'attacco.",
      "Grazie alle direttive strategiche di Coach {dCoach}, l'imboscata viene disinnescata.",
      "{dJungle} piazza lumi profondi svelando la traiettoria iniziale di {oJungle}."
    ],
    s2: [
      "PRIMO SANGUE! {dJungle} usa al meglio {dJungleChamp} e abbatte con astuzia {oMid}.",
      "UCCISIONE IN SOLITARIA! Riflessi d'acciaio: {dTop} annienta {oTop} sulla corsia superiore.",
      "Doppia uccisione in botlane! {dAdc} e {dSup} spazzano via gli avversari."
    ],
    s3: [
      "Il tuo team assicura le Larve del Vuoto, velocizzando la demolizione delle torri.",
      "{dJungle} reclama il Drago dell'Oceano senza subire alcun danno.",
      "{dTop} usa il Teletrasporto e punisce severamente un errore di posizionamento di {oppName}."
    ],
    s4: [
      "Scontro cruciale per l'Araldo! {dTop} stordisce la frontline avversaria con maestria.",
      "{dMid} usa {dMidChamp} ed eroga un danno spaventoso respingendo {oppName}.",
      "La botlane blocca il tiratore avversario regalando la prima torre del match."
    ],
    s5: [
      "Assedio tattico attorno al Barone. Coach {dCoach} impone il controllo totale della mappa.",
      "Meccaniche perfette! {dAdc} schiva le abilità nemiche con precisione millimetrica.",
      "La pressione laterale esercitata da {dTop} disperde le file di {oppName}."
    ],
    s6Win: [
      "FURTO DECORATO DEL BARONE! Il coraggioso jungler {dJungle} si lancia e ruba l'obiettivo!",
      "Trappola perfetta al Barone. {dAdc} distrugge la difesa avversaria."
    ],
    s6Loss: [
      "Disastro totale! Il jungler oponente {oJungle} sconfigge il Barone.",
      "Intrappolati nella fossa del drago, la letale combo di {oMid} distrugge le nostre speranze."
    ],
    s7Win: [
      "SENSACIONAL ACE! {dMid} lancia un'eccellente abilità suprema con {dMidChamp}. Vittoria!",
      "QUADRA KILL PER {dAdc}! Con lo scudo provvidenziale di {dSup}, demolisce {oppName}."
    ],
    s7Loss: [
      "La linea difensiva cede. {oMid} penetra la linea posteriore decimando il team.",
      "Imboscata letale nella nebbia. {dAdc} cade prima di poter reagire."
    ]
  },
  pt: {
    s1: [
      "Invasão agressiva de nível 1! {dSup} usa o Flash para roubar o bônus inimigo.",
      "Sob o plano tático do Coach {dCoach}, a equipe se defende de forma primorosa.",
      "{dJungle} posiciona sentinelas profundas revelando o caminho de {oJungle}."
    ],
    s2: [
      "FIRST BLOOD! {dJungle} utilizando {dJungleChamp} executa um gank perfeito contra {oMid}.",
      "SOLO KILL! Com reflexos extraordinários, {dTop} aniquila {oTop} na rota do topo.",
      "Double kill no bot! {dAdc} e {dSup} assumem controle total da rota."
    ],
    s3: [
      "Sua equipe garante as Larvas do Vazio, impulsionando a queda das torres.",
      "{dJungle} garante o Dragão do Oceano com controle de mapa soberbo.",
      "{dTop} usa teleporte para punir um deslize de posicionamento da {oppName}."
    ],
    s4: [
      "Batalha pelo Arauto do Vale! {dTop} realiza um controle de grupo devastador.",
      "{dMid} descarrega dano massivo com {dMidChamp} dizimando a oposição.",
      "A dupla do bot elimina {oAdc} facilitando a conquista da primeira torre."
    ],
    s5: [
      "Duelo estratégico ao redor do Barão Nashor. O Coach {dCoach} guia o posicionamento de visão.",
      "Mecânica espetacular! O atirador {dAdc} esquiva-se de todas as habilidades enviadas.",
      "A rotação dividida de {dTop} quebra as defesas inimigas da {oppName}."
    ],
    s6Win: [
      "ROUBO SENSACIONAL DE BARÃO! {dJungle} avança destemido e rouba o bônus crucial!",
      "Armadilha perfeita no rio. {dAdc} avança dizimando a linha de defesa inimiga."
    ],
    s6Loss: [
      "Tragédia! O caçador inimigo {oJungle} rouba o Barão Nashor com facilidade.",
      "Encurralados na rota, o combo combinado de {oMid} destrói a vida de seus campeões."
    ],
    s7Win: [
      "SENSACIONAL ACE! {dMid} executa a ultimate definitiva perfeita com {dMidChamp}!",
      "QUADRA KILL DE {dAdc}! Com suporte inigualável de {dSup}, limpa a batalha decisiva."
    ],
    s7Loss: [
      "A defesa cai por terra! {oMid} surpreende pelas costas detonando seus atiradores.",
      "Emboscados na selva. Seu tirador {dAdc} é eliminado num piscar de olhos."
    ]
  },
  ru: {
    s1: [
      "Агрессивное вторжение на 1 уровне! {dSup} тратит скачок для зачистки вражеской зоны.",
      "Под предводительством тренера {dCoach} команда демонстрирует оборонную стратегию.",
      "{dJungle} расставляет варды раскрывая расположение соперника {oJungle}."
    ],
    s2: [
      "ПЕРВАЯ КРОВЬ! Лесник {dJungle} на {dJungleChamp} делает идеальный ганк на мид и убивает {oMid}.",
      "СОЛО КИЛЛ! {dTop} наказывает {oTop} на верхней линии благодаря выдающейся реакции.",
      "Двойное убийство на боте! {dAdc} и {dSup} подчиняют себе нижнюю линию."
    ],
    s3: [
      "Ваша команда забирает Личинок Бездны, доминируя на дальних линиях.",
      "{dJungle} без проблем убивает Океанического Дракона.",
      "{dTop} телепортируется на бот чтобы покарать за ошибку {oppName}."
    ],
    s4: [
      "Сражение за Герольда Ущелья! {dTop} сдаёт массовый контроль по врагу.",
      "{dMid} наносит безумный урон с {dMidChamp} разрезая защиту оппонентов.",
      "Ботлейн ловит соперника {oAdc}, что открывает путь к первой вышке."
    ],
    s5: [
      "Тактический танец у Барона Нашора. Опыт тренера {dCoach} помогает занять позиции.",
      "Потрясающее уклонение! {dAdc} уворачивается от всех умений, демонстрируя микроконтроль.",
      "Сплит-пуш от {dTop} заставляет {oppName} совершить фатальную перегруппировку."
    ],
    s6Win: [
      "ЛЕГЕНДАРНЫЙ СТИЛ БАРОНА! Лесник {dJungle} влетает в логово и забирает Нашора!",
      "Превосходная ловушка у Барона. {dAdc} разделывается с защитниками врага."
    ],
    s6Loss: [
      "Трагедия! Вражеский лесник {oJungle} забивает Нашора из-под носа команды.",
      "Окружены и уничтожены в речном загоне. Тяжёлый ультимейт {oMid} хоронит шансы."
    ],
    s7Win: [
      "ПОТРЯСАЮЩИЙ ТУЗ! {dMid} стирает врагов идеальной ультой на {dMidChamp}. Победа!",
      "КВАДРАКИЛЛ ДЛЯ {dAdc}! Получив защитные щиты от {dSup}, расстреливает {oppName}."
    ],
    s7Loss: [
      "Линия обороны разлетается! Вражеский мидер {oMid} заходит с тыла.",
      "Смертельный зажим в кустах. Ваш стрелок {dAdc} погибает до начала битвы."
    ]
  },
  ko: {
    s1: [
      "강력한 1레벨 인베이드! {dSup} 선수가 적극적인 점멸 변수로 상대를 압박합니다.",
      "{dCoach} 감독의 짜임새 있는 밴픽 플랜 아래 팀이 빈틈없는 방어전을 펼칩니다.",
      "{dJungle} 선수가 깊숙한 와딩을 통해 {oJungle}의 초반 동선을 예측합니다."
    ],
    s2: [
      "퍼스트 블러드! {dJungle} 선수가 {dJungleChamp}로 칼날 같은 갱킹을 성공시켜 {oMid}를 처치합니다.",
      "솔로 킬! 피지컬 한계 돌파로 {dTop} 선수가 {oTop}를 완벽하게 제압합니다.",
      "바텀 듀오 처치! {dAdc}와 {dSup}가 환상적인 호흡으로 상대 바텀을 무력화시킵니다."
    ],
    s3: [
      "우리 팀이 공허 유충을 완벽히 통제하며 상대 외곽 타워 압박을 극대화합니다.",
      "{dJungle} 선수가 아군의 라인 주도권을 등에 업고 편안하게 대지 드래곤을 사냥합니다.",
      "순간이동 연계! {dTop} 선수가 하단 지원 사격에 나서 오버파밍하던 {oppName}를 응징합니다."
    ],
    s4: [
      "협곡의 전령을 둘러싼 대규모 한타! {dTop} 선수가 기막힌 군중제어로 이니시에이팅을 펼칩니다.",
      "{dMid} 선수가 {dMidChamp}의 압도적인 누킹 딜링으로 상대 진영을 궤멸시킵니다.",
      "바텀 정밀 낚시 성공! {oAdc}를 처치하고 손쉽게 바텀 포탑을 철거합니다."
    ],
    s5: [
      "내셔 남작 둥지 앞 눈치싸움! {dCoach} 감독의 오더가 빛을 발하며 시야 싸움을 승리합니다.",
      "환상적인 무빙! 원거리 딜러 {dAdc} 선수가 완벽한 미세 조작으로 적의 포화를 흘려냅니다.",
      "{dTop} 선수의 매서운 사이드 라인 압박에 {oppName}의 진영이 무너지기 시작합니다."
    ],
    s6Win: [
      "전설적인 바론 스틸! {dJungle} 선수가 한계 상황에서 강타 싸움에 승리하며 역사를 만들어냅니다!",
      "완벽한 바론 미끼 작전! 적이 둥지로 빨려 들어오자 {dAdc}가 전원을 섬멸시킵니다."
    ],
    s6Loss: [
      "바론 수성 실패! 상대 정글러 {oJungle}가 정밀한 스마이트로 내셔 남작을 도둑맞습니다.",
      "둥지에 갇힌 채 {oMid} 선수의 광역 폭딜 연계에 휩쓸려 큰 손해를 입습니다."
    ],
    s7Win: [
      "센세이셔널 에이스! {dMid} 선수가 {dMidChamp}로 4인 궁 대박을 터뜨리며 승리를 확정 짓습니다!",
      "{dAdc}의 쿼드라 킬! {dSup}의 눈부신 아군 케어 속에서 {oppName} 진영을 완벽히 추풍낙엽으로 만듭니다."
    ],
    s7Loss: [
      "본대 방어구멍 발생! 상대 미드 {oMid} 선수가 날카로운 뒤라인 급습으로 주력 딜러진을 격발합니다.",
      "어둠 속 대기 낚시에 당합니다! {dAdc} 선수가 스킬 회전 전에 폭사하며 한타가 패배로 기웁니다."
    ]
  },
  zh: {
    s1: [
      "极其激进的1级入侵野区！辅助 {dSup} 交出闪现先手，点燃河道引信。",
      "在主教练 {dCoach} 战旗妙法的布置下，全队打出了一波堪称教科书的完美防守反击。",
      "打野 {dJungle} 做下极深的视野，完全摸透了敌方打野 {oJungle} 的前期刷野节奏。"
    ],
    s2: [
      "一血诞生！打野 {dJungle} 操刀 {dJungleChamp} 奉献绝伦中路阻击，瞬杀敌方 {oMid}！",
      "单杀！上路 {dTop} 展现了极为恐怖的极限微操，在兵线前悍然斩杀对手 {oTop}！",
      "下路打出线杀双杀！{dAdc} 携手 {dSup} 技能组合拉满，直接打穿了下路对垒。"
    ],
    s3: [
      "我方战队无压力收下虚空巢虫，直接吹响了拔除敌方外塔的攻势号角。",
      "中下线权在握，打野 {dJungle} 节奏美如画，兵不血刃控下首条大洋巨龙。",
      "传送参战！上单 {dTop} 极限传送绕后，重创了执迷于入侵的 {oppName} 并拿回了主动权。"
    ],
    s4: [
      "峡谷先锋团战爆发！上单 {dTop} 突施冷箭放出完美群体控制，一举锁死了敌方前排。",
      "中单 {dMid} 使用其招牌 {dMidChamp} 轰出毁天灭地的高额爆发，击溃了敌方防线！",
      "下路神射精准锁定！强势线杀敌方核心射手 {oAdc}，顺利拔除敌方下路一塔。"
    ],
    s5: [
      "大龙坑前令人窒息的视野拉锯战！教练 {dCoach} 的战术指令回响，团队稳健地控制视野。",
      "神级走位！射手 {dAdc} 在乱军之中辗转腾挪，细节微操片叶不沾身躲过致命技能。",
      "上单 {dTop} 完美的边线分推逼迫 {oppName} 做出痛苦抉择，其防守阵脚瞬间严重失衡。"
    ],
    s6Win: [
      "奇迹抢龙！打野 {dJungle} 在绝路之中搏命闪现抢龙，在千钧一发之际惩戒下大龙！",
      "完美大龙逼团！敌方刚踏入河道便遭到埋伏，{dAdc} 绝境收割团灭了对手。"
    ],
    s6Loss: [
      "大龙失守！敌方打野 {oJungle} 展现高超控龙技术，强顶惩戒拿下了纳什男爵大块肉点。",
      "被堵在龙坑死角中，被敌方中单 {oMid} 极具毁灭性的光波大招倾巢之下全部融化。"
    ],
    s7Win: [
      "不可思议的团灭 (ACE)！中单 {dMid} 抓到死角打出核爆终结 ultimate，所有人屏气凝神！",
      "神射 {dAdc} 怒斩四杀 (QUADRA KILL)！在辅助 {dSup} 舍生取义的严密贴合护航下，扫清乾坤！"
    ],
    s7Loss: [
      "阵线撕裂！敌方中单 {oMid} 找到完美侧翼切入口，一套致命刺杀连招将我方后排蒸发。",
      "在诡谲草丛中遭遇埋伏。核心神射 {dAdc} 甚至来不及打出第一发平A便遭遇集火阵亡。"
    ]
  }
};

export default function MatchSimulatorView({
  draft,
  opponentTeamsList,
  currentRound,
  teamScore,
  synergyDetails,
  onRoundComplete,
  onResetTournament,
  gameMode = 'normal',
  lang = 'es',
}: MatchSimulatorViewProps) {
  const [simulator, setSimulator] = useState<MatchSimulator | null>(null);
  const [isPlayingEvents, setIsPlayingEvents] = useState(false);
  const [displayedEvents, setDisplayedEvents] = useState<MatchEvent[]>([]);
  const [gameResultTriggered, setGameResultTriggered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTrans = TRANSLATIONS[lang] || TRANSLATIONS['es'];

  // Auto-scroll combat logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedEvents]);

  // Setup/Draw Match when round loads
  useEffect(() => {
    let validOpponents = opponentTeamsList.filter(t => {
      if (t.id === 'custom') return false;
      if (gameMode === 'normal') {
        if (t.region === 'LEC') {
          return t.hasWorldsAppearance === true;
        }
      }
      return true;
    });

    // Rule boundary: LEC Hard Mode splits matches
    if (gameMode === 'lecHard') {
      if (currentRound < 3) {
        // LEC Playoffs stage: opponents must be only from LEC!
        validOpponents = opponentTeamsList.filter(t => t.region === 'LEC' && t.id !== 'custom');
      } else {
        // Worlds stage: opponents must be titans from Non-LEC regions (LPL, LCK giants only)
        validOpponents = opponentTeamsList.filter(t => t.region !== 'LEC' && t.region !== 'LCS' && t.id !== 'custom');
      }
    }

    // Default fallback if filtered list is empty to prevent crash
    if (validOpponents.length === 0) {
      validOpponents = opponentTeamsList.filter(t => t.id !== 'custom');
    }

    const randomOpponent = validOpponents[Math.floor(Math.random() * validOpponents.length)];

    const oRoster = randomOpponent.roster;
    const oAvg = (
      oRoster.top.rating +
      oRoster.jungle.rating +
      oRoster.mid.rating +
      oRoster.adc.rating +
      oRoster.support.rating +
      oRoster.coach.rating
    ) / 6;
    
    // Calculate difficult modifiers
    let roundDifficultyBonus = currentRound * 1.5; 
    
    if (gameMode === 'lecHard') {
      if (currentRound < 3) {
        // LEC is competitive (+1 to +5 OVR)
        roundDifficultyBonus = currentRound * 2.5 + 1.5;
      } else {
        // International stages in World are absolutely monstrous! (+7 to +13 OVR)
        roundDifficultyBonus = currentRound * 3.2 + 2.5;
      }
    }

    const opponentFinalScore = Math.round(oAvg + roundDifficultyBonus);

    // Calculate win probability
    const scoreDiff = teamScore - opponentFinalScore;
    const baseWinChance = (gameMode === 'normal' ? 56 : 50) + (scoreDiff * 4.4);
    // Hard limit win values to maintain challenge while remaining possible
    const winChance = gameMode === 'normal'
      ? Math.max(22, Math.min(95, baseWinChance))
      : Math.max(12, Math.min(91, baseWinChance));

    setSimulator({
      opponent: randomOpponent,
      playerScore: teamScore,
      opponentScore: opponentFinalScore,
      events: [],
      status: 'pending',
      progress: 0,
      winChance,
    });
    setDisplayedEvents([]);
    setIsPlayingEvents(false);
    setGameResultTriggered(false);
  }, [currentRound, teamScore, opponentTeamsList, gameMode]);

  if (!simulator) return null;

  // Compile Match Events dynamically depending on localized sets
  const generateMatchEvents = (userWin: boolean, opp: HistoricalTeam) => {
    const dTop = draft.top.player?.name || 'Top';
    const dJungle = draft.jungle.player?.name || 'Jungle';
    const dMid = draft.mid.player?.name || 'Mid';
    const dAdc = draft.adc.player?.name || 'ADC';
    const dSup = draft.support.player?.name || 'Support';
    const dCoach = draft.coach.player?.name || 'Coach';

    const dTopChamp = draft.top.player?.signatureChampion || 'Renekton';
    const dJungleChamp = draft.jungle.player?.signatureChampion || 'Lee Sin';
    const dMidChamp = draft.mid.player?.signatureChampion || 'Orianna';
    const dAdcChamp = draft.adc.player?.signatureChampion || 'Ezreal';
    const dSupChamp = draft.support.player?.signatureChampion || 'Thresh';

    const oTop = opp.roster.top.name;
    const oJungle = opp.roster.jungle.name;
    const oMid = opp.roster.mid.name;
    const oAdc = opp.roster.adc.name;
    const oSup = opp.roster.support.name;

    const oppName = opp.name;

    const translateTemplate = (str: string) => {
      return str
        .replace(/{dTop}/g, dTop)
        .replace(/{dJungle}/g, dJungle)
        .replace(/{dMid}/g, dMid)
        .replace(/{dAdc}/g, dAdc)
        .replace(/{dSup}/g, dSup)
        .replace(/{dCoach}/g, dCoach)
        .replace(/{dTopChamp}/g, dTopChamp)
        .replace(/{dJungleChamp}/g, dJungleChamp)
        .replace(/{dMidChamp}/g, dMidChamp)
        .replace(/{dAdcChamp}/g, dAdcChamp)
        .replace(/{dSupChamp}/g, dSupChamp)
        .replace(/{oTop}/g, oTop)
        .replace(/{oJungle}/g, oJungle)
        .replace(/{oMid}/g, oMid)
        .replace(/{oAdc}/g, oAdc)
        .replace(/{oSup}/g, oSup)
        .replace(/{oppName}/g, oppName);
    };

    const transSet = EVENT_TRANSLATIONS[lang] || EVENT_TRANSLATIONS['es'];

    const getOption = (arr: string[]) => {
      const selected = arr[Math.floor(Math.random() * arr.length)];
      return translateTemplate(selected);
    };

    return [
      { time: '01:20', type: 'general' as const, message: getOption(transSet.s1) },
      { time: '05:05', type: 'kill' as const, message: getOption(transSet.s2) },
      { time: '10:20', type: 'objective' as const, message: getOption(transSet.s3) },
      { time: '16:40', type: 'fight' as const, message: getOption(transSet.s4) },
      { time: '22:15', type: 'general' as const, message: getOption(transSet.s5) },
      { 
        time: '28:10', 
        type: 'objective' as const, 
        message: userWin ? getOption(transSet.s6Win) : getOption(transSet.s6Loss) 
      },
      { 
        time: '34:00', 
        type: 'fight' as const, 
        message: userWin ? getOption(transSet.s7Win) : getOption(transSet.s7Loss) 
      },
    ];
  };

  const handleStartMatchSimulation = () => {
    if (simulator.status !== 'pending') return;

    // Run rng simulation
    const dice = Math.random() * 100;
    const isPlayerWin = dice < simulator.winChance;

    const compiledEvents = generateMatchEvents(isPlayerWin, simulator.opponent);

    const targetKills = isPlayerWin 
      ? Math.floor(Math.random() * 11) + 15  // 15 - 25 kills
      : Math.floor(Math.random() * 10) + 4;  // 4 - 13 kills
      
    const targetDeaths = isPlayerWin
      ? Math.floor(Math.random() * 10) + 4   // 4 - 13 deaths
      : Math.floor(Math.random() * 11) + 15; // 15 - 25 deaths

    setSimulator(prev => {
      if (!prev) return null;
      return {
        ...prev,
        events: compiledEvents,
        status: 'simulating',
        targetKills,
        targetDeaths,
        currentKills: 0,
        currentDeaths: 0,
      };
    });

    setIsPlayingEvents(true);
    setDisplayedEvents([]);
    setGameResultTriggered(false);

    // Roll events sequence with delays
    let currentEventCursor = 0;
    const speed = 1200; // time between alerts

    const tick = () => {
      if (currentEventCursor < compiledEvents.length) {
        const eventToAdd = compiledEvents[currentEventCursor];
        setDisplayedEvents(prev => [...prev, eventToAdd]);
        currentEventCursor++;
        setSimulator(prev => {
          if (!prev) return null;

          const tk = prev.targetKills ?? targetKills;
          const td = prev.targetDeaths ?? targetDeaths;
          const ck = prev.currentKills ?? 0;
          const cd = prev.currentDeaths ?? 0;

          // Calculate step kills/deaths incremental values
          let addKills = 0;
          let addDeaths = 0;
          
          if (currentEventCursor === compiledEvents.length) {
            // Guarantee final match target precisely
            addKills = tk - ck;
            addDeaths = td - cd;
          } else {
            // Incremental
            if (currentEventCursor === 1) {
              addKills = Math.floor(tk * 0.15);
              addDeaths = Math.floor(td * 0.15);
            } else if (currentEventCursor === 2) {
              addKills = Math.floor(tk * 0.15);
              addDeaths = Math.floor(td * 0.15);
            } else if (currentEventCursor === 3) {
              addKills = Math.floor(tk * 0.25);
              addDeaths = Math.floor(td * 0.25);
            } else if (currentEventCursor === 4) {
              addKills = Math.floor(tk * 0.10);
              addDeaths = Math.floor(td * 0.10);
            } else if (currentEventCursor === 5) {
              addKills = Math.floor(tk * 0.15);
              addDeaths = Math.floor(td * 0.15);
            }
          }

          return {
            ...prev,
            progress: Math.round((currentEventCursor / compiledEvents.length) * 100),
            currentKills: ck + addKills,
            currentDeaths: cd + addDeaths,
          };
        });
        setTimeout(tick, speed);
      } else {
        // Conclude simulation
        setSimulator(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: isPlayerWin ? 'win' : 'loss',
            currentKills: prev.targetKills,
            currentDeaths: prev.targetDeaths,
          };
        });
        setIsPlayingEvents(false);
        setGameResultTriggered(true);

        // Play subtle sound effects to enrich the victory / defeat moments
        if (isPlayerWin) {
          playVictorySound();
        } else {
          playDefeatSound();
        }
      }
    };

    setTimeout(tick, 500);
  };

  const handleAdvance = () => {
    if (simulator.status === 'win') {
      onRoundComplete(true, simulator.opponent, {
        kills: simulator.currentKills ?? 0,
        deaths: simulator.currentDeaths ?? 0,
      });
    } else {
      onRoundComplete(false, simulator.opponent, {
        kills: simulator.currentKills ?? 0,
        deaths: simulator.currentDeaths ?? 0,
      });
    }
  };

  const localizedRoundTitle = getLocalizedRoundName(currentRound, gameMode, lang);

  return (
    <div id="combat-simulation-view-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto">
      {/* Competitor Panel (Col Span 5) */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        <div id="simulated-matchup-header" className="bg-[#091428] border border-[#c8aa6e]/35 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-radial from-[#c8aa6e]/10 to-transparent pointer-events-none" />
          
          <h2 className="text-[11px] font-black tracking-widest text-[#c8aa6e] uppercase mb-1 flex items-center gap-1">
            <span>🛡️</span> {activeTrans.roundNameIntro}
          </h2>
          <h3 className="text-xl font-extrabold text-[#f0e6d2] uppercase font-display select-none">
            {localizedRoundTitle} VS {simulator.opponent.name.toUpperCase()}
          </h3>

          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#c8aa6e]/10">
            {/* Squad OVR */}
            <div className="text-center bg-[#010a13] p-3 rounded-xl border border-[#c8aa6e]/15 flex-1 shadow-md">
              <span className="text-[9px] font-bold tracking-wider text-[#a09b8c] uppercase">{lang === 'es' ? 'ALINEACIÓN OVR' : 'YOUR SQUAD'}</span>
              <p className="text-3xl font-black text-[#c8aa6e] font-sans tracking-tighter mt-1">{simulator.playerScore}</p>
            </div>
            {/* VS separator */}
            <div className="text-[#c8aa6e]/40 font-black text-xs italic tracking-widest px-2">VS</div>
            {/* Opponent OVR */}
            <div className="text-center bg-[#010a13] p-3 rounded-xl border border-red-500/20 flex-1 shadow-md">
              <span className="text-[9px] font-bold tracking-wider text-[#a09b8c] uppercase">{lang === 'es' ? 'RIVAL OVR' : 'RIVAL TEAM'}</span>
              <p className="text-3xl font-black text-red-500 font-sans tracking-tighter mt-1">{simulator.opponentScore}</p>
            </div>
          </div>

          {/* Sinergy breakdown brief stats */}
          <div className="mt-4 p-3 bg-[#010a13]/60 border border-[#c8aa6e]/10 rounded-xl flex items-center justify-between text-xs text-[#a09b8c]">
            <span className="font-mono text-[10px]">{lang === 'es' ? 'QUÍMICAS COMPARTIDAS:' : 'ACTIVE SYNERS:'}</span>
            <span className="font-bold text-[#f0e6d2] bg-[#c8aa6e]/10 border border-[#c8aa6e]/20 px-2 py-0.5 rounded">
              +{synergyDetails.total} {lang === 'es' ? 'Química' : 'Chemistry'}
            </span>
          </div>
        </div>

        {/* Probability display */}
        <div id="simulated-odds-card" className="bg-[#091428] border border-[#c8aa6e]/25 rounded-2xl p-5 shadow-xl">
          <h4 className="text-xs font-bold text-[#a09b8c] uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-[#c8aa6e]" />
            <span>{activeTrans.winProbability}</span>
          </h4>

          {/* Bar graphical mapping */}
          <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#c8aa6e] via-[#e5c68f] to-emerald-400 transition-all duration-1000 shadow-[0_0_10px_rgba(200,170,110,0.5)]"
              style={{ width: `${simulator.winChance}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="text-left">
              <span className="text-xs font-bold text-[#c8aa6e]">{simulator.winChance.toFixed(2)}%</span>
              <p className="text-[9px] text-[#a09b8c] font-medium uppercase tracking-widest">{lang === 'es' ? 'Victoria estimada' : 'Est. Success'}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-red-400">{(100 - simulator.winChance).toFixed(2)}%</span>
              <p className="text-[9px] text-[#a09b8c] font-medium uppercase tracking-widest">{lang === 'es' ? 'Riesgo Derrota' : 'Risk of loss'}</p>
            </div>
          </div>
        </div>

        {/* Roster composition mini specs */}
        <div id="opponent-roster-spec-details" className="bg-[#050c14]/90 border border-[#c8aa6e]/10 rounded-2xl p-5 shadow-md flex-1">
          <h4 className="text-[10px] font-black text-[#c8aa6e] tracking-widest uppercase mb-3 flex items-center gap-1">
            <span>⚔️</span> {lang === 'es' ? `ROSTER RIVAL DE ${simulator.opponent.name.toUpperCase()}` : `${simulator.opponent.name.toUpperCase()} ROSTER`}
          </h4>
          <div className="flex flex-col gap-2 font-mono text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#c8aa6e]/5 text-[#a09b8c]">
              <span>🛡️ TOP</span>
              <span className="text-[#f0e6d2] font-semibold">{simulator.opponent.roster.top.name} ({simulator.opponent.roster.top.rating})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c8aa6e]/5 text-[#a09b8c]">
              <span>⚔️ JNG</span>
              <span className="text-[#f0e6d2] font-semibold">{simulator.opponent.roster.jungle.name} ({simulator.opponent.roster.jungle.rating})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c8aa6e]/5 text-[#a09b8c]">
              <span>🔮 MID</span>
              <span className="text-[#f0e6d2] font-semibold">{simulator.opponent.roster.mid.name} ({simulator.opponent.roster.mid.rating})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c8aa6e]/5 text-[#a09b8c]">
              <span>🎯 ADC</span>
              <span className="text-[#f0e6d2] font-semibold">{simulator.opponent.roster.adc.name} ({simulator.opponent.roster.adc.rating})</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c8aa6e]/5 text-[#a09b8c]">
              <span>⭐ SUP</span>
              <span className="text-[#f0e6d2] font-semibold">{simulator.opponent.roster.support.name} ({simulator.opponent.roster.support.rating})</span>
            </div>
            <div className="flex justify-between items-center py-1 text-[#a09b8c]">
              <span>🧠 ENTR</span>
              <span className="text-[#c8aa6e] font-semibold">{simulator.opponent.roster.coach.name} ({simulator.opponent.roster.coach.rating})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Simulator Live Feeds (Col Span 7) */}
      <div className="lg:col-span-7 flex flex-col h-[520px] bg-[#010a13] border border-[#c8aa6e]/20 rounded-2xl relative shadow-2xl overflow-hidden">
        {/* Banner header screen */}
        <div className="bg-[#091428]/95 px-4.5 py-2.5 border-b border-[#c8aa6e]/15 flex flex-col gap-2 relative">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlayingEvents ? 'bg-red-500' : 'bg-[#c8aa6e]'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlayingEvents ? 'bg-red-500' : 'bg-[#c8aa6e]'}`} />
              </span>
              <span className="text-[10px] font-black text-[#f0e6d2] uppercase tracking-widest">
                {lang === 'es' ? 'PARTIDA EN VIVO' : 'LIVE CONFRONTATION'}
              </span>
            </div>

            {isPlayingEvents ? (
              <span className="text-[9px] font-black text-[#c8aa6e] bg-[#c8aa6e]/10 border border-[#c8aa6e]/20 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse flex items-center gap-1">
                <span>⚡</span> {activeTrans.simulatingPulse}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-[#a09b8c] uppercase tracking-wider">
                {lang === 'es' ? 'CONCLUIDO' : 'CONCLUDED'}
              </span>
            )}
          </div>

          {/* REAL TIME SCOREBOARD! UNDERNEATH IN SECOND LINE FOR METICULOUS MOBILE SPACING */}
          {(isPlayingEvents || simulator.status === 'win' || simulator.status === 'loss') && (
            <div className="flex items-center justify-center gap-3 px-3 py-1.5 bg-[#010a13] border border-[#c8aa6e]/20 rounded-lg font-mono text-xs shadow-inner animate-fade-in w-full">
              <span className="text-[9px] text-[#a09b8c] uppercase tracking-widest font-sans font-black">
                {lang === 'es' ? 'TU EQUIPO' : 'YOUR TEAM'}
              </span>
              <span className="text-blue-400 font-bold text-sm bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20 shadow-sm">
                {simulator.currentKills ?? 0}
              </span>
              <span className="text-[#c8aa6e]/80 font-black font-sans text-[11px]">VS</span>
              <span className="text-red-400 font-bold text-sm bg-red-500/10 px-2.5 py-0.5 rounded border border-red-500/20 shadow-sm">
                {simulator.currentDeaths ?? 0}
              </span>
              <span className="text-[9px] text-[#a09b8c] uppercase tracking-widest font-sans font-black truncate max-w-[120px]">
                {simulator.opponent.name}
              </span>
            </div>
          )}
        </div>

        {/* Combat logging box */}
        <div 
          ref={scrollRef}
          id="simulation-combat-feed-logs"
          className="flex-1 overflow-y-auto p-4.5 space-y-4 font-mono scroll-smooth bg-radial from-[#010a13] to-[#040e1a]/95 text-xs text-[#a09b8c] leading-relaxed"
        >
          {displayedEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-45 gap-2 select-none">
              <Swords className="w-10 h-10 text-[#c8aa6e] opacity-40" />
              <p className="text-[10px] uppercase tracking-widest text-[#a09b8c] max-w-xs leading-normal">
                {lang === 'es' ? 'SISTEMA DE TRANSMISIONES DE LA GROP DISPONIBLE' : 'WARP SUMMON CHANNELS READY'}
              </p>
              <p className="text-[9px] italic text-[#a09b8c]/80">
                {lang === 'es' ? 'Pulsa "INICIAR PARTIDA" abajo para comenzar.' : 'Press "START MATCH" below to begin.'}
              </p>
            </div>
          ) : (
            displayedEvents.map((evt, idx) => (
              <div 
                key={idx}
                className="p-3 bg-[#091428]/45 border-l-2 border-[#c8aa6e]/60 rounded-r-xl shadow-inner animate-fade-in-up flex items-stretch gap-3.5 transition-all hover:bg-[#091428]/60"
              >
                <div className="text-[#c8aa6e] font-black tracking-tight flex items-center justify-center border-r border-[#c8aa6e]/10 pr-2 select-none font-mono">
                  {evt.time}
                </div>
                <div className="flex-1 text-[#f0e6d2]/90 flex items-center leading-normal font-sans">
                  {evt.message}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action controllers */}
        <div className="p-4 bg-[#091428]/95 border-t border-[#c8aa6e]/15">
          {simulator.status === 'pending' && (
            <button
              id="start-live-simulation-btn"
              onClick={handleStartMatchSimulation}
              className="w-full py-4 bg-[#c8aa6e] hover:brightness-115 text-[#010a13] font-black text-sm uppercase tracking-widest rounded-xl cursor-pointer shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              {activeTrans.simulateBtn}
            </button>
          )}

          {/* Running Spinner indicator */}
          {simulator.status === 'simulating' && (
            <div className="w-full flex items-center justify-center gap-2.5 py-4 text-[#a09b8c] font-bold uppercase tracking-wider">
              <Zap className="w-5 h-5 text-[#c8aa6e] animate-bounce" />
              <span>{activeTrans.simulatingProgress} ({simulator.progress}%)</span>
            </div>
          )}

          {/* Results states indicators */}
          {gameResultTriggered && !isPlayingEvents && (
            <div className="w-full flex flex-col gap-4 text-center">
              {simulator.status === 'win' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="flex items-center gap-3 text-left">
                    <Trophy className="w-8 h-8 text-emerald-400 animate-bounce" />
                    <div>
                      <h4 className="font-black text-emerald-400 text-sm uppercase tracking-wide">
                        {gameMode === 'lecHard' && currentRound === 2 
                          ? activeTrans.lecChampionTitle 
                          : (currentRound === 5 
                            ? activeTrans.victoryTitle 
                            : (lang === 'es' ? '¡VICTORIA EN LA RONDA!' : 
                               lang === 'en' ? 'ROUND VICTORY!' :
                               lang === 'fr' ? 'VICTOIRE DE LA RONDA !' :
                               lang === 'de' ? 'RUNDEN-SIEG!' :
                               lang === 'it' ? 'VITTORIA DEL TURNO!' :
                               lang === 'pt' ? 'VITÓRIA DE RODADA!' :
                               lang === 'ru' ? 'ПОБЕДА В РАУНДЕ!' :
                               lang === 'ko' ? '라운드 승리!' : '本轮获胜！'))}
                      </h4>
                      <p className="text-[11px] text-[#a09b8c]">
                        {gameMode === 'lecHard' && currentRound === 2 
                          ? activeTrans.lecChampionDesc 
                          : (currentRound === 5 
                            ? activeTrans.victoryDesc 
                            : (lang === 'es' ? 'Buen juego. Tu plantilla progresa correctamente y asegura el pase a la siguiente fase.' : 
                               lang === 'en' ? 'Good match. Your roster progresses cleanly and locks in their ticket to the next stage.' :
                               lang === 'fr' ? 'Bien joué. Votre équipe progresse et valide son ticket pour la suite de l\'aventure.' :
                               lang === 'de' ? 'Gutes Match. Dein Kader kommt weiter und sichert sich das Ticket für die nächste Runde.' :
                               lang === 'it' ? 'Ottimo match. Il tuo roster progredisce e si assicura l\'accesso al turno successivo.' :
                               lang === 'pt' ? 'Bom jogo. Sua equipe avança na clave e garante a vaga na próxima etapa.' :
                               lang === 'ru' ? 'Хороший раунд. Ваша команда закрепила проход в следующий узел турнира.' :
                               lang === 'ko' ? '뛰어난 호흡입니다. 팀이 안정적으로 다음 하위 라운드 진출에 성공했습니다.' : '比赛结束，表现精彩。你的阵容已成功保级并晋级下一场对抗。'))}
                      </p>
                    </div>
                  </div>
                  <button
                    id="advance-next-round-btn"
                    onClick={handleAdvance}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-colors"
                  >
                    OK
                  </button>
                </div>
              ) : (
                <div className="bg-red-950/15 border border-red-500/25 p-4 rounded-xl flex flex-col sm:flex-row gap-3 items-center justify-between mt-1">
                  <div className="flex items-center gap-3 text-left">
                    <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
                    <div>
                      <h4 className="font-black text-red-400 text-sm uppercase tracking-wide">{activeTrans.defeatTitle}</h4>
                      <p className="text-[11px] text-[#a09b8c] leading-normal font-medium">
                        {lang === 'es' 
                          ? 'Desafío completado. Tu plantilla ha competido con honor pero la run ha terminado.'
                          : 'Challenge completed. Your squad competed with honor but the run has concluded.'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    id="advance-next-round-defeat-btn"
                    onClick={handleAdvance}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-widest rounded-lg cursor-pointer transition-colors"
                  >
                    {lang === 'es' ? 'VER PANEL DE RESULTADOS' : 'VIEW RUN RESULTS'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
