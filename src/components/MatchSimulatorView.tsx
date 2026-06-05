import React, { useState, useEffect, useRef } from 'react';
import { TeamDraft, HistoricalTeam, MatchEvent, MatchSimulator, Region, Player, GameMode } from '../types';
import { Trophy, Shield, Play, RotateCcw, Swords, Compass, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { Language, TRANSLATIONS, getLocalizedRoundName } from '../locales';
import { playVictorySound, playDefeatSound } from '../utils/audio';
import ExoClickAd from './ExoClickAd';

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
  matchHistory?: {
    roundIndex: number;
    roundName: string;
    opponentName: string;
    opponentYear: number;
    opponentRegion: string;
    result: 'W' | 'L';
  }[];
  onRoundComplete: (
    success: boolean,
    opponent?: HistoricalTeam,
    performance?: { kills: number; deaths: number }
  ) => void;
  onResetTournament: (fullReset: boolean) => void;
  gameMode?: GameMode;
  lang?: Language;
}

// Multilingual live commentary engine with score-aware match flow.
// The scoreboard is now driven by narrative patterns instead of linear proportional increments,
// so matches can include comebacks, throws, back-and-forth fights, clean stomps and late-game flips.
type CommentaryState =
  | 'setup'
  | 'playerLead'
  | 'opponentLead'
  | 'even'
  | 'swingToPlayer'
  | 'swingToOpponent'
  | 'finalWin'
  | 'finalLoss';

type CommentarySet = Record<CommentaryState, string[]>;

type KillSnapshot = {
  kills: number;
  deaths: number;
};

type FlowPattern = {
  id: string;
  killRatio: number[];
  deathRatio: number[];
};

const MATCH_TIMELINE = ['01:20', '04:45', '09:30', '15:15', '21:40', '28:10', '34:00'];

const WIN_PATTERNS: FlowPattern[] = [
  {
    id: 'cleanWin',
    killRatio: [0.05, 0.18, 0.36, 0.54, 0.72, 0.88, 1],
    deathRatio: [0.02, 0.10, 0.22, 0.36, 0.52, 0.68, 1],
  },
  {
    id: 'comebackWin',
    killRatio: [0.00, 0.08, 0.22, 0.38, 0.58, 0.78, 1],
    deathRatio: [0.20, 0.45, 0.62, 0.70, 0.78, 0.88, 1],
  },
  {
    id: 'backAndForthWin',
    killRatio: [0.10, 0.20, 0.38, 0.45, 0.66, 0.76, 1],
    deathRatio: [0.06, 0.30, 0.34, 0.56, 0.62, 0.82, 1],
  },
  {
    id: 'lateFlipWin',
    killRatio: [0.02, 0.12, 0.25, 0.40, 0.55, 0.80, 1],
    deathRatio: [0.14, 0.30, 0.48, 0.58, 0.68, 0.78, 1],
  },
];

const LOSS_PATTERNS: FlowPattern[] = [
  {
    id: 'slowLoss',
    killRatio: [0.03, 0.12, 0.24, 0.38, 0.52, 0.72, 1],
    deathRatio: [0.12, 0.28, 0.45, 0.62, 0.78, 0.90, 1],
  },
  {
    id: 'throwLoss',
    killRatio: [0.14, 0.34, 0.56, 0.72, 0.84, 0.92, 1],
    deathRatio: [0.04, 0.14, 0.28, 0.46, 0.68, 0.86, 1],
  },
  {
    id: 'backAndForthLoss',
    killRatio: [0.10, 0.18, 0.42, 0.50, 0.72, 0.82, 1],
    deathRatio: [0.06, 0.32, 0.38, 0.56, 0.66, 0.86, 1],
  },
  {
    id: 'stompLoss',
    killRatio: [0.00, 0.08, 0.18, 0.30, 0.46, 0.66, 1],
    deathRatio: [0.16, 0.34, 0.52, 0.70, 0.84, 0.93, 1],
  },
];

const LIVE_COMMENTARY: Record<Language, CommentarySet> = {
  es: {
    setup: [
      'La Grieta se abre con lectura de jungla: {dJungle} coloca visión profunda y {dCoach} pide paciencia antes del primer choque.',
      'Inicio tenso. {dSup} flota por río, {dMid} guarda prioridad y {oppName} responde con defensa cerrada de sus campamentos.',
      'Nivel 1 con mucho respeto: ambos equipos miden el tempo, pero {dTop} ya presiona la primera oleada para ganar prioridad lateral.',
      'El plan inicial es claro: control de visión, líneas estables y esperar el primer error de {oppName}.',
    ],
    playerLead: [
      'Tu equipo toma ventaja ({score}). {dJungle} castiga la ruta rival y convierte la presión de líneas en control de mapa.',
      '{dMid} mueve primero desde medio y fuerza un pick limpio. El marcador favorece a tu roster: {score}.',
      'Buen intercambio para tu equipo. {dAdc} juega con spacing perfecto y {dSup} protege la backline sin perder tempo.',
      'La prioridad de líneas empieza a pesar. {dTop} gana presión lateral y obliga a {oppName} a contestar tarde.',
      'La lectura macro de {dCoach} funciona: rotación rápida, visión en río y nuevo castigo sobre la jungla enemiga.',
    ],
    opponentLead: [
      '{oppName} golpea primero y pone el marcador en {score}. Tu equipo necesita limpiar visión antes del siguiente objetivo.',
      'Mala ventana de tempo: {oJungle} encuentra el ángulo y castiga una rotación demasiado profunda.',
      'La partida se complica. {oMid} gana prioridad en medio y {oppName} empieza a cerrar el mapa.',
      'Tu botlane queda sin visión y {oppName} convierte el pick en presión sobre dragón. Marcador actual: {score}.',
      'El rival está leyendo bien los resets. Toca calmar la partida y evitar otro shutdown innecesario.',
    ],
    even: [
      'La partida está en el filo ({score}). Nadie consigue romper el mapa y el próximo objetivo puede decidir el tempo.',
      'Intercambio caótico en río: ambos equipos pierden recursos, pero ninguno sale realmente limpio.',
      'La ventaja cambia de manos en cada oleada. {dCoach} pide paciencia: no hace falta forzar sin visión.',
      'Mucho baile alrededor del objetivo. La pelea está igualada y un solo engage puede partir la partida.',
    ],
    swingToPlayer: [
      '¡Remontada en marcha! {dJungle} encuentra el smite, {dMid} llega antes y tu equipo gira el marcador: {score}.',
      '¡Cambio de guion! {dSup} inicia con precisión, {dAdc} limpia la pelea y {oppName} pierde el control del río.',
      'Tu equipo castiga el exceso de confianza rival. Shutdown clave y la partida vuelve a respirar.',
      'Lectura brillante de {dCoach}: cebo sobre Nashor, colapso inmediato y la ventaja cambia de lado.',
    ],
    swingToOpponent: [
      '¡Cuidado con el throw! Tu equipo se pasa de agresivo y {oppName} castiga el mal posicionamiento. Marcador: {score}.',
      'El rival responde con una cazada en la niebla de guerra. {dAdc} cae antes de pegar y la pelea se desordena.',
      'La ventaja se escapa por una mala entrada al río. {oMid} encuentra el flanco y rompe la formación.',
      'Demasiado riesgo sin visión. {oppName} lee la jugada y convierte una defensa en contraataque.',
    ],
    finalWin: [
      '¡ACE definitivo! {dMid} encuentra el engage final, {dAdc} remata la pelea y tu equipo cierra la partida con {score}.',
      '¡Victoria trabajada! Nashor, oleadas sincronizadas y ejecución limpia: {oppName} no aguanta el último asedio.',
      'La llamada final de {dCoach} es perfecta. Tu equipo fuerza la pelea buena, gana el 5v5 y avanza de ronda.',
      '¡GG! Después de una partida llena de swings, tu roster encuentra la pelea decisiva y destruye el nexo.',
    ],
    finalLoss: [
      'Derrota dolorosa. {oppName} encuentra la pelea decisiva, rompe la backline y cierra el mapa con {score}.',
      'La última pelea sale mal: sin visión en Nashor, {oJungle} asegura el objetivo y {oppName} sentencia la partida.',
      'Tu equipo compite, pero el rival castiga mejor los errores finales. La run se detiene aquí.',
      'No alcanza la remontada. {oppName} aguanta la presión, encuentra el pick clave y acaba cerrando la serie.',
    ],
  },
  en: {
    setup: [
      'The Rift opens with jungle tracking: {dJungle} drops deep vision while Coach {dCoach} calls for patience.',
      'Tense early game. {dSup} hovers river, {dMid} protects mid priority and {oppName} answers with a tight defensive setup.',
      'A measured level one: both teams test the tempo, but {dTop} is already pushing for side-lane priority.',
      'The opening plan is clear: vision control, stable lanes and punish the first mistake from {oppName}.',
    ],
    playerLead: [
      'Your team takes the lead ({score}). {dJungle} punishes the enemy pathing and converts lane pressure into map control.',
      '{dMid} moves first from mid and forces a clean pick. Your roster now leads: {score}.',
      'Great trade for your squad. {dAdc} spaces perfectly while {dSup} keeps the backline alive.',
      'Lane priority is starting to matter. {dTop} creates side pressure and forces {oppName} to answer late.',
      'Coach {dCoach} reads the map perfectly: quick rotation, river vision and another punish in the enemy jungle.',
    ],
    opponentLead: [
      '{oppName} strikes first and pushes the score to {score}. Your team needs to clear vision before the next objective.',
      'Bad tempo window: {oJungle} finds the angle and punishes an overextended rotation.',
      'The game gets harder. {oMid} wins mid priority and {oppName} starts closing the map.',
      'Bot side loses vision and {oppName} turns one pick into dragon pressure. Current score: {score}.',
      'The opponent is reading the reset timers well. Time to slow it down and avoid another shutdown.',
    ],
    even: [
      'The game is on a knife-edge ({score}). Nobody has broken the map yet and the next objective can decide the tempo.',
      'Chaotic river trade: both teams spend resources, but nobody gets a clean exit.',
      'The lead changes with every wave. Coach {dCoach} calls for patience: no need to force without vision.',
      'Heavy dance around the objective. One clean engage can split the game wide open.',
    ],
    swingToPlayer: [
      'Comeback loading! {dJungle} wins the smite, {dMid} arrives first and your team flips the score: {score}.',
      'Script flipped! {dSup} finds the engage, {dAdc} cleans up and {oppName} loses river control.',
      'Your squad punishes the overconfidence. Key shutdown secured and the game breathes again.',
      'Brilliant call from Coach {dCoach}: Baron bait, instant collapse and the lead changes hands.',
    ],
    swingToOpponent: [
      'Throw warning! Your squad overextends and {oppName} punishes the positioning mistake. Score: {score}.',
      'The enemy answers with a fog-of-war catch. {dAdc} drops before dealing damage and the fight falls apart.',
      'The lead slips away after a risky river entry. {oMid} finds the flank and breaks the formation.',
      'Too much risk without vision. {oppName} reads the play and turns defense into counterattack.',
    ],
    finalWin: [
      'Decisive ACE! {dMid} finds the final engage, {dAdc} cleans the fight and your team closes with {score}.',
      'Hard-earned victory! Baron, synced waves and clean execution: {oppName} cannot survive the final siege.',
      'Coach {dCoach} makes the perfect final call. Your team forces the right fight, wins the 5v5 and advances.',
      'GG! After a game full of swings, your roster finds the decisive fight and destroys the Nexus.',
    ],
    finalLoss: [
      'Painful defeat. {oppName} finds the decisive fight, breaks the backline and closes the map with {score}.',
      'The last fight goes wrong: no Baron vision, {oJungle} secures the objective and {oppName} ends the game.',
      'Your squad competes, but the opponent punishes the final mistakes better. The run ends here.',
      'The comeback is not enough. {oppName} absorbs the pressure, finds the key pick and closes the series.',
    ],
  },
  fr: {
    setup: [
      'La Faille s’ouvre avec une lecture de jungle : {dJungle} pose une vision profonde et Coach {dCoach} demande de la patience.',
      'Début tendu. {dSup} contrôle la rivière, {dMid} garde la priorité mid et {oppName} répond avec une défense serrée.',
      'Niveau 1 prudent : les deux équipes testent le tempo, mais {dTop} cherche déjà la priorité latérale.',
      'Le plan est clair : contrôle de vision, lanes stables et punir la première erreur de {oppName}.',
    ],
    playerLead: [
      'Votre équipe prend l’avantage ({score}). {dJungle} punit le pathing adverse et transforme la pression en contrôle de carte.',
      '{dMid} bouge le premier depuis le mid et force un pick propre. Votre roster mène : {score}.',
      'Très bon échange. {dAdc} garde un spacing parfait pendant que {dSup} protège la backline.',
      'La priorité de lane commence à peser. {dTop} crée une pression latérale qui force {oppName} à répondre trop tard.',
    ],
    opponentLead: [
      '{oppName} frappe d’abord et mène {score}. Votre équipe doit nettoyer la vision avant le prochain objectif.',
      'Mauvaise fenêtre de tempo : {oJungle} trouve l’angle et punit une rotation trop profonde.',
      'La partie se complique. {oMid} gagne la priorité mid et {oppName} commence à fermer la carte.',
      'La botlane perd la vision et {oppName} transforme un pick en pression dragon. Score actuel : {score}.',
    ],
    even: [
      'La partie est sur un fil ({score}). Personne ne casse vraiment la carte et le prochain objectif peut tout changer.',
      'Échange chaotique en rivière : beaucoup de ressources dépensées, mais personne ne sort vraiment gagnant.',
      'L’avantage change à chaque vague. Coach {dCoach} demande de la patience : pas de force sans vision.',
      'Danse tendue autour de l’objectif. Un seul engage propre peut ouvrir la partie.',
    ],
    swingToPlayer: [
      'La remontée commence ! {dJungle} gagne le smite, {dMid} arrive en premier et votre équipe retourne le score : {score}.',
      'Changement de scénario ! {dSup} trouve l’engage, {dAdc} nettoie le fight et {oppName} perd la rivière.',
      'Votre équipe punit l’excès de confiance adverse. Shutdown clé et la partie respire de nouveau.',
      'Lecture brillante de Coach {dCoach} : bait Baron, collapse immédiat et l’avantage change de camp.',
    ],
    swingToOpponent: [
      'Attention au throw ! Votre équipe force trop loin et {oppName} punit le mauvais placement. Score : {score}.',
      'L’adversaire répond avec un catch dans le brouillard de guerre. {dAdc} tombe avant de DPS.',
      'L’avantage s’échappe après une entrée risquée en rivière. {oMid} trouve le flank parfait.',
      'Trop de risque sans vision. {oppName} lit le play et transforme la défense en contre-attaque.',
    ],
    finalWin: [
      'ACE décisif ! {dMid} trouve l’engage final, {dAdc} nettoie le fight et votre équipe conclut en {score}.',
      'Victoire méritée ! Baron, vagues synchronisées et exécution propre : {oppName} ne tient pas le dernier siège.',
      'Dernier call parfait de Coach {dCoach}. Votre équipe force le bon 5v5 et passe au tour suivant.',
      'GG ! Après une partie pleine de retournements, votre roster trouve le fight décisif et détruit le Nexus.',
    ],
    finalLoss: [
      'Défaite douloureuse. {oppName} trouve le fight décisif, casse la backline et ferme la carte en {score}.',
      'Le dernier fight tourne mal : pas de vision Baron, {oJungle} sécurise l’objectif et {oppName} termine.',
      'Votre équipe se bat, mais l’adversaire punit mieux les erreurs finales. La run s’arrête ici.',
      'La remontée ne suffit pas. {oppName} absorbe la pression, trouve le pick clé et clôt la série.',
    ],
  },
  de: {
    setup: [
      'Die Kluft startet mit Jungle-Tracking: {dJungle} setzt tiefe Sicht und Coach {dCoach} fordert Geduld.',
      'Angespannter Start. {dSup} kontrolliert den Fluss, {dMid} hält Mid-Priorität und {oppName} verteidigt eng.',
      'Vorsichtiges Level 1: Beide Teams testen das Tempo, aber {dTop} sucht bereits Side-Lane-Priorität.',
      'Der Plan ist klar: Sichtkontrolle, stabile Lanes und den ersten Fehler von {oppName} bestrafen.',
    ],
    playerLead: [
      'Dein Team übernimmt die Führung ({score}). {dJungle} bestraft das gegnerische Pathing und gewinnt Map-Kontrolle.',
      '{dMid} rotiert zuerst aus der Mitte und erzwingt einen sauberen Pick. Dein Roster führt: {score}.',
      'Guter Trade für dein Team. {dAdc} spielt perfektes Spacing und {dSup} schützt die Backline.',
      'Lane-Priorität wird spürbar. {dTop} baut Seitendruck auf und zwingt {oppName} zu einer späten Antwort.',
    ],
    opponentLead: [
      '{oppName} schlägt zuerst zu und stellt auf {score}. Dein Team muss vor dem nächsten Ziel die Sicht klären.',
      'Schlechtes Tempofenster: {oJungle} findet den Winkel und bestraft eine zu tiefe Rotation.',
      'Das Spiel wird schwieriger. {oMid} gewinnt Mid-Priorität und {oppName} schließt die Karte.',
      'Bot verliert die Sicht und {oppName} macht aus einem Pick Druck auf den Drachen. Stand: {score}.',
    ],
    even: [
      'Das Spiel steht auf Messers Schneide ({score}). Das nächste Ziel kann das Tempo komplett drehen.',
      'Chaotischer Fight am Fluss: Beide Teams investieren viel, aber niemand kommt sauber heraus.',
      'Die Führung wechselt mit jeder Wave. Coach {dCoach} fordert Geduld: nicht ohne Sicht forcen.',
      'Tanz um das Objective. Ein sauberer Engage kann das Spiel öffnen.',
    ],
    swingToPlayer: [
      'Comeback läuft! {dJungle} gewinnt den Smite, {dMid} ist zuerst da und dein Team dreht den Stand: {score}.',
      'Drehbuchwechsel! {dSup} findet den Engage, {dAdc} räumt auf und {oppName} verliert die Flusskontrolle.',
      'Dein Team bestraft die gegnerische Überheblichkeit. Wichtiger Shutdown, das Spiel lebt wieder.',
      'Starker Call von Coach {dCoach}: Baron-Bait, sofortiger Collapse und die Führung wechselt.',
    ],
    swingToOpponent: [
      'Throw-Gefahr! Dein Team überzieht und {oppName} bestraft das Positioning. Stand: {score}.',
      'Der Gegner antwortet mit einem Catch aus dem Fog of War. {dAdc} fällt, bevor Schaden kommt.',
      'Die Führung rutscht weg nach einem riskanten Flusseingang. {oMid} findet die perfekte Flanke.',
      'Zu viel Risiko ohne Sicht. {oppName} liest den Play und macht aus Verteidigung Gegenangriff.',
    ],
    finalWin: [
      'Entscheidendes ACE! {dMid} findet den finalen Engage, {dAdc} räumt auf und dein Team beendet mit {score}.',
      'Erarbeiteter Sieg! Baron, synchronisierte Waves und saubere Ausführung: {oppName} hält den letzten Siege nicht.',
      'Perfekter letzter Call von Coach {dCoach}. Dein Team erzwingt den richtigen 5v5-Fight und kommt weiter.',
      'GG! Nach vielen Swings findet dein Roster den entscheidenden Fight und zerstört den Nexus.',
    ],
    finalLoss: [
      'Bittere Niederlage. {oppName} findet den entscheidenden Fight, bricht die Backline und beendet mit {score}.',
      'Der letzte Fight kippt: keine Baron-Sicht, {oJungle} sichert das Objective und {oppName} schließt ab.',
      'Dein Team kämpft, aber der Gegner bestraft die letzten Fehler besser. Die Run endet hier.',
      'Das Comeback reicht nicht. {oppName} hält dem Druck stand, findet den Schlüssel-Pick und beendet die Serie.',
    ],
  },
  it: {
    setup: [
      'La Landa si apre con lettura della giungla: {dJungle} piazza visione profonda e Coach {dCoach} chiede pazienza.',
      'Avvio teso. {dSup} controlla il fiume, {dMid} mantiene priorità mid e {oppName} risponde con difesa compatta.',
      'Livello 1 prudente: entrambi testano il tempo, ma {dTop} cerca già priorità laterale.',
      'Piano chiaro: controllo visione, corsie stabili e punire il primo errore di {oppName}.',
    ],
    playerLead: [
      'Il tuo team prende vantaggio ({score}). {dJungle} punisce il pathing rivale e converte pressione in controllo mappa.',
      '{dMid} ruota per primo dal mid e forza un pick pulito. Il tuo roster conduce: {score}.',
      'Ottimo scambio. {dAdc} gioca con spacing perfetto e {dSup} protegge la backline.',
      'La priorità di corsia pesa. {dTop} crea pressione laterale e costringe {oppName} a rispondere tardi.',
    ],
    opponentLead: [
      '{oppName} colpisce per primo e porta il punteggio su {score}. Serve ripulire la visione prima del prossimo obiettivo.',
      'Finestra di tempo negativa: {oJungle} trova l’angolo e punisce una rotazione troppo profonda.',
      'La partita si complica. {oMid} prende priorità mid e {oppName} inizia a chiudere la mappa.',
      'La botlane perde visione e {oppName} trasforma un pick in pressione drago. Score attuale: {score}.',
    ],
    even: [
      'Partita sul filo ({score}). Nessuno rompe davvero la mappa e il prossimo obiettivo può decidere il tempo.',
      'Scambio caotico nel fiume: risorse spese da entrambi, ma nessuno esce veramente pulito.',
      'Il vantaggio cambia a ogni wave. Coach {dCoach} chiede calma: non forzare senza visione.',
      'Danza pesante attorno all’obiettivo. Un engage pulito può spaccare la partita.',
    ],
    swingToPlayer: [
      'Rimonta in corso! {dJungle} vince lo smite, {dMid} arriva prima e il team gira il punteggio: {score}.',
      'Cambio di copione! {dSup} trova l’engage, {dAdc} pulisce la fight e {oppName} perde il fiume.',
      'Il tuo team punisce l’eccesso di fiducia. Shutdown chiave e la partita respira di nuovo.',
      'Lettura brillante di Coach {dCoach}: bait al Barone, collapse immediato e vantaggio ribaltato.',
    ],
    swingToOpponent: [
      'Rischio throw! Il tuo team esagera e {oppName} punisce il posizionamento. Score: {score}.',
      'Il rivale risponde con un pick nella nebbia di guerra. {dAdc} cade prima di fare danno.',
      'Il vantaggio scivola via dopo un ingresso rischioso nel fiume. {oMid} trova il flank perfetto.',
      'Troppo rischio senza visione. {oppName} legge la giocata e trasforma la difesa in contrattacco.',
    ],
    finalWin: [
      'ACE decisivo! {dMid} trova l’engage finale, {dAdc} chiude la fight e il team vince con {score}.',
      'Vittoria sudata! Barone, wave sincronizzate ed esecuzione pulita: {oppName} non regge l’ultimo assedio.',
      'Ultima chiamata perfetta di Coach {dCoach}. Il tuo team forza il 5v5 giusto e avanza.',
      'GG! Dopo una partita piena di swing, il roster trova la fight decisiva e distrugge il Nexus.',
    ],
    finalLoss: [
      'Sconfitta dolorosa. {oppName} trova la fight decisiva, rompe la backline e chiude con {score}.',
      'Ultima fight sbagliata: niente visione al Barone, {oJungle} assicura l’obiettivo e {oppName} termina.',
      'Il tuo team compete, ma il rivale punisce meglio gli errori finali. La run finisce qui.',
      'La rimonta non basta. {oppName} regge la pressione, trova il pick chiave e chiude la serie.',
    ],
  },
  pt: {
    setup: [
      'A Selva começa com leitura de rota: {dJungle} coloca visão profunda e Coach {dCoach} pede paciência.',
      'Início tenso. {dSup} controla o rio, {dMid} segura prioridade no meio e {oppName} responde com defesa fechada.',
      'Nível 1 calculado: as duas equipes testam o tempo, mas {dTop} já busca prioridade lateral.',
      'Plano claro: controle de visão, rotas estáveis e punir o primeiro erro de {oppName}.',
    ],
    playerLead: [
      'Sua equipe assume a frente ({score}). {dJungle} pune a rota inimiga e transforma pressão em controle de mapa.',
      '{dMid} se move primeiro pelo meio e força um pick limpo. Seu roster lidera: {score}.',
      'Boa troca para sua equipe. {dAdc} joga com spacing perfeito enquanto {dSup} protege a backline.',
      'A prioridade de rotas começa a pesar. {dTop} cria pressão lateral e força {oppName} a responder tarde.',
    ],
    opponentLead: [
      '{oppName} bate primeiro e coloca o placar em {score}. Sua equipe precisa limpar visão antes do próximo objetivo.',
      'Janela ruim de tempo: {oJungle} encontra o ângulo e pune uma rotação profunda demais.',
      'A partida complica. {oMid} ganha prioridade no meio e {oppName} começa a fechar o mapa.',
      'A botlane fica sem visão e {oppName} transforma um pick em pressão de dragão. Placar: {score}.',
    ],
    even: [
      'Partida no limite ({score}). Ninguém quebra o mapa e o próximo objetivo pode decidir o tempo.',
      'Troca caótica no rio: recursos dos dois lados, mas ninguém sai realmente limpo.',
      'A vantagem muda a cada wave. Coach {dCoach} pede calma: não forçar sem visão.',
      'Dança pesada ao redor do objetivo. Um engage limpo pode abrir a partida.',
    ],
    swingToPlayer: [
      'Virada em andamento! {dJungle} vence o smite, {dMid} chega primeiro e sua equipe vira o placar: {score}.',
      'Mudança de roteiro! {dSup} encontra o engage, {dAdc} limpa a luta e {oppName} perde o rio.',
      'Sua equipe pune a confiança exagerada rival. Shutdown chave e a partida volta a respirar.',
      'Leitura brilhante de Coach {dCoach}: bait no Barão, collapse imediato e vantagem trocada.',
    ],
    swingToOpponent: [
      'Perigo de throw! Sua equipe força demais e {oppName} pune o posicionamento. Placar: {score}.',
      'O rival responde com um pick na névoa de guerra. {dAdc} cai antes de causar dano.',
      'A vantagem escapa após uma entrada arriscada no rio. {oMid} acha o flanco perfeito.',
      'Risco demais sem visão. {oppName} lê a jogada e transforma defesa em contra-ataque.',
    ],
    finalWin: [
      'ACE decisivo! {dMid} encontra o engage final, {dAdc} limpa a luta e sua equipe fecha em {score}.',
      'Vitória trabalhada! Barão, waves sincronizadas e execução limpa: {oppName} não aguenta o último cerco.',
      'Chamada final perfeita de Coach {dCoach}. Sua equipe força o 5v5 certo e avança.',
      'GG! Depois de muitos swings, seu roster encontra a luta decisiva e destrói o Nexus.',
    ],
    finalLoss: [
      'Derrota dolorosa. {oppName} encontra a luta decisiva, quebra a backline e fecha com {score}.',
      'A última luta dá errado: sem visão no Barão, {oJungle} garante o objetivo e {oppName} termina.',
      'Sua equipe compete, mas o rival pune melhor os erros finais. A run acaba aqui.',
      'A virada não basta. {oppName} segura a pressão, encontra o pick chave e fecha a série.',
    ],
  },
  ru: {
    setup: [
      'Ущелье открывается чтением леса: {dJungle} ставит глубокий вижен, а тренер {dCoach} просит терпения.',
      'Напряжённое начало. {dSup} контролирует реку, {dMid} держит приоритет, а {oppName} отвечает плотной обороной.',
      'Осторожный первый уровень: команды проверяют темп, но {dTop} уже давит боковую линию.',
      'План понятен: контроль вижена, стабильные линии и наказание первой ошибки {oppName}.',
    ],
    playerLead: [
      'Ваша команда выходит вперёд ({score}). {dJungle} наказывает маршрут соперника и переводит давление в контроль карты.',
      '{dMid} первым уходит с мида и находит чистый пик. Ваш состав ведёт: {score}.',
      'Отличный размен. {dAdc} держит дистанцию, а {dSup} защищает бэклайн.',
      'Приоритет линий начинает решать. {dTop} создаёт боковое давление и заставляет {oppName} отвечать поздно.',
    ],
    opponentLead: [
      '{oppName} бьёт первым и ставит счёт {score}. Нужно зачистить вижен перед следующим объектом.',
      'Плохое окно темпа: {oJungle} находит угол и наказывает слишком глубокую ротацию.',
      'Игра усложняется. {oMid} забирает приоритет мида, и {oppName} начинает закрывать карту.',
      'Бот теряет вижен, а {oppName} превращает пик в давление на дракона. Счёт: {score}.',
    ],
    even: [
      'Игра на тонкой грани ({score}). Никто не ломает карту, и следующий объект может решить темп.',
      'Хаотичный размен на реке: ресурсы потрачены с обеих сторон, но чистого преимущества нет.',
      'Преимущество меняется с каждой волной. Тренер {dCoach} просит не форсить без вижена.',
      'Танец вокруг объекта. Один чистый engage может открыть игру.',
    ],
    swingToPlayer: [
      'Камбэк начинается! {dJungle} выигрывает smite, {dMid} приходит первым и команда переворачивает счёт: {score}.',
      'Сценарий меняется! {dSup} находит engage, {dAdc} дочищает драку, и {oppName} теряет реку.',
      'Команда наказывает самоуверенность соперника. Важный shutdown, игра снова дышит.',
      'Гениальный колл {dCoach}: bait на Бароне, мгновенный collapse и переворот преимущества.',
    ],
    swingToOpponent: [
      'Опасность throw! Команда заходит слишком далеко, и {oppName} наказывает позиционку. Счёт: {score}.',
      'Соперник отвечает ловушкой из тумана войны. {dAdc} падает до нанесения урона.',
      'Преимущество уходит после рискованного входа на реку. {oMid} находит идеальный фланг.',
      'Слишком много риска без вижена. {oppName} читает play и превращает защиту в контратаку.',
    ],
    finalWin: [
      'Решающий ACE! {dMid} находит финальный engage, {dAdc} дочищает fight, и команда закрывает {score}.',
      'Трудовая победа! Барон, синхронные волны и чистое исполнение: {oppName} не выдерживает последнюю осаду.',
      'Идеальный последний колл {dCoach}. Команда форсит правильный 5v5 и проходит дальше.',
      'GG! После игры со множеством swings ваш состав находит решающую драку и ломает Nexus.',
    ],
    finalLoss: [
      'Болезненное поражение. {oppName} находит решающую драку, ломает бэклайн и закрывает {score}.',
      'Последний fight идёт плохо: нет вижена на Бароне, {oJungle} забирает объект, и {oppName} заканчивает.',
      'Команда борется, но соперник лучше наказывает финальные ошибки. Run заканчивается здесь.',
      'Камбэка не хватает. {oppName} выдерживает давление, находит ключевой pick и закрывает серию.',
    ],
  },
  ko: {
    setup: [
      '협곡이 열립니다. {dJungle}가 깊은 시야를 잡고 {dCoach} 감독은 첫 교전을 기다리라고 지시합니다.',
      '초반 긴장감이 높습니다. {dSup}가 강가를 견제하고 {dMid}는 미드 주도권을 지킵니다.',
      '조심스러운 1레벨입니다. 양 팀이 템포를 재는 동안 {dTop}은 사이드 주도권을 노립니다.',
      '초반 계획은 분명합니다. 시야 장악, 안정적인 라인전, 그리고 {oppName}의 첫 실수를 응징하는 것.',
    ],
    playerLead: [
      '우리 팀이 앞서갑니다 ({score}). {dJungle}가 상대 동선을 처벌하며 맵 장악으로 연결합니다.',
      '{dMid}가 먼저 움직이며 깔끔한 픽을 만듭니다. 현재 스코어는 {score}.',
      '좋은 교환입니다. {dAdc}는 완벽한 거리 조절을 보여주고 {dSup}는 후방을 지킵니다.',
      '라인 주도권이 힘을 발휘합니다. {dTop}이 사이드 압박으로 {oppName}의 대응을 늦춥니다.',
    ],
    opponentLead: [
      '{oppName}이 먼저 앞서갑니다. 스코어는 {score}. 다음 오브젝트 전에 시야 정리가 필요합니다.',
      '나쁜 템포입니다. {oJungle}가 각을 찾고 깊은 로테이션을 처벌합니다.',
      '경기가 어려워집니다. {oMid}가 미드 주도권을 잡으며 {oppName}이 맵을 닫기 시작합니다.',
      '바텀 시야가 사라졌고 {oppName}이 픽 하나를 드래곤 압박으로 바꿉니다. 현재 {score}.',
    ],
    even: [
      '경기는 팽팽합니다 ({score}). 다음 오브젝트가 템포를 결정할 수 있습니다.',
      '강가에서 혼전이 벌어집니다. 양쪽 모두 자원을 썼지만 확실한 승자는 없습니다.',
      '웨이브마다 주도권이 바뀝니다. {dCoach} 감독은 시야 없는 무리한 싸움을 막습니다.',
      '오브젝트 앞 신경전이 길어집니다. 깔끔한 이니시 하나가 경기를 가를 수 있습니다.',
    ],
    swingToPlayer: [
      '역전의 흐름입니다! {dJungle}가 강타 싸움에서 이기고 {dMid}가 먼저 합류하며 스코어를 뒤집습니다: {score}.',
      '흐름이 바뀝니다! {dSup}가 이니시를 열고 {dAdc}가 한타를 정리합니다.',
      '상대의 과욕을 제대로 응징합니다. 중요한 셧다운으로 경기가 다시 살아납니다.',
      '{dCoach} 감독의 콜이 빛납니다. 바론 미끼, 즉시 붕괴, 그리고 주도권 전환.',
    ],
    swingToOpponent: [
      '스로우 위험입니다! 우리 팀이 너무 깊게 들어갔고 {oppName}이 포지셔닝을 처벌합니다. {score}.',
      '상대가 전장의 안개에서 함정을 준비했습니다. {dAdc}가 딜하기 전에 먼저 쓰러집니다.',
      '위험한 강가 진입 후 주도권이 흔들립니다. {oMid}가 완벽한 측면 진입을 찾았습니다.',
      '시야 없는 과한 리스크입니다. {oppName}이 플레이를 읽고 역습으로 전환합니다.',
    ],
    finalWin: [
      '결정적인 에이스! {dMid}가 마지막 이니시를 열고 {dAdc}가 정리하며 {score}로 승리합니다.',
      '값진 승리입니다! 바론, 동기화된 웨이브, 깔끔한 실행으로 {oppName}은 마지막 공성을 버티지 못합니다.',
      '{dCoach} 감독의 마지막 콜이 완벽합니다. 올바른 5대5를 강제하고 다음 라운드로 갑니다.',
      'GG! 수많은 변곡점 끝에 로스터가 결정적 한타를 잡고 넥서스를 파괴합니다.',
    ],
    finalLoss: [
      '아쉬운 패배입니다. {oppName}이 결정적 한타를 잡고 후방을 무너뜨리며 {score}로 마무리합니다.',
      '마지막 한타가 무너집니다. 바론 시야가 없고 {oJungle}가 오브젝트를 확보합니다.',
      '우리 팀도 맞섰지만 마지막 실수를 상대가 더 잘 처벌했습니다. run은 여기서 끝납니다.',
      '역전에는 조금 부족했습니다. {oppName}이 압박을 버티고 핵심 픽을 찾아 시리즈를 닫습니다.',
    ],
  },
  zh: {
    setup: [
      '召唤师峡谷开局就进入野区博弈：{dJungle} 做下深视野，{dCoach} 要求队伍先稳住节奏。',
      '开局十分紧张。{dSup} 控制河道，{dMid} 保持中路线权，{oppName} 则用严密防守回应。',
      '谨慎的一级团试探。双方都在观察节奏，但 {dTop} 已经开始争夺边线主动权。',
      '开局计划很明确：控视野、稳住线权，然后惩罚 {oppName} 的第一个失误。',
    ],
    playerLead: [
      '你的队伍取得领先（{score}）。{dJungle} 惩罚对方打野路线，并把线权转化为地图控制。',
      '{dMid} 率先游走，完成一次干净的抓单。当前你的阵容领先：{score}。',
      '这波交换很漂亮。{dAdc} 站位极好，{dSup} 稳稳保护后排。',
      '线权开始发挥作用。{dTop} 制造边线压力，迫使 {oppName} 迟迟无法正面接团。',
    ],
    opponentLead: [
      '{oppName} 率先打开局面，比分来到 {score}。你的队伍必须先清理视野再争夺下个资源。',
      '节奏窗口很差：{oJungle} 找到角度，惩罚了一次过深的转线。',
      '局势开始变难。{oMid} 拿到中路线权，{oppName} 开始封锁地图。',
      '下路失去视野，{oppName} 把一次抓单转化为小龙压力。当前比分：{score}。',
    ],
    even: [
      '比赛非常胶着（{score}）。双方都还没打穿地图，下个资源可能决定节奏。',
      '河道混战爆发：双方都交出大量资源，但没人能完全脱身。',
      '优势随着每一波兵线变化。{dCoach} 要求队伍冷静：没有视野就不要强开。',
      '资源点前持续拉扯。一次干净的开团就可能改变比赛。',
    ],
    swingToPlayer: [
      '逆转开始！{dJungle} 赢下惩戒，{dMid} 率先赶到，你的队伍扭转比分：{score}。',
      '剧情反转！{dSup} 找到完美先手，{dAdc} 收割战场，{oppName} 失去河道控制。',
      '你的队伍惩罚了对方的贪心。关键 shutdown 到手，比赛重新有了呼吸空间。',
      '{dCoach} 的判断太亮眼：大龙诱敌、瞬间包夹，优势转手。',
    ],
    swingToOpponent: [
      '小心被翻！你的队伍过度深入，{oppName} 惩罚了站位失误。比分：{score}。',
      '对方在战争迷雾中完成埋伏。{dAdc} 还没输出就被秒掉。',
      '一次冒险的河道进入让优势溜走。{oMid} 找到完美侧翼切入。',
      '没有视野却承担太多风险。{oppName} 读到了这波，并把防守变成反击。',
    ],
    finalWin: [
      '决定性团灭！{dMid} 找到最后开团，{dAdc} 完成收割，你的队伍以 {score} 结束比赛。',
      '艰难但漂亮的胜利！大龙、同步兵线、干净执行：{oppName} 挡不住最后一波推进。',
      '{dCoach} 的最后指挥完美。你的队伍逼出正确的 5v5 并晋级下一轮。',
      'GG！经历多次局势反转后，你的阵容找到决定性团战并摧毁水晶。',
    ],
    finalLoss: [
      '遗憾落败。{oppName} 找到决定性团战，撕开后排并以 {score} 结束比赛。',
      '最后一波团战出问题：大龙视野不足，{oJungle} 拿下资源，{oppName} 终结比赛。',
      '你的队伍打得很顽强，但对手更好地惩罚了最后阶段的失误。run 到此为止。',
      '逆转还差一点。{oppName} 顶住压力，找到关键抓单并结束系列赛。',
    ],
  },
};

const chooseRandom = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const clampNumber = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const createFinalScoreline = (userWin: boolean, playerScore: number, opponentScore: number) => {
  const scoreGap = playerScore - opponentScore;
  const advantageBoost = clampNumber(Math.round(scoreGap / 8), -4, 4);

  if (userWin) {
    const kills = randomInt(17, 29) + Math.max(0, advantageBoost);
    let deaths = randomInt(7, 18) - Math.max(0, advantageBoost);
    deaths = clampNumber(deaths, 4, kills - 2);

    return {
      targetKills: kills,
      targetDeaths: deaths,
    };
  }

  const deaths = randomInt(17, 30) + Math.max(0, -advantageBoost);
  let kills = randomInt(6, 19) + Math.max(0, advantageBoost);
  kills = clampNumber(kills, 2, deaths - 2);

  return {
    targetKills: kills,
    targetDeaths: deaths,
  };
};

const buildKillTimeline = (userWin: boolean, targetKills: number, targetDeaths: number): KillSnapshot[] => {
  const pattern = chooseRandom(userWin ? WIN_PATTERNS : LOSS_PATTERNS);

  const timeline = pattern.killRatio.map((killRatio, idx) => {
    const deathRatio = pattern.deathRatio[idx];

    if (idx === pattern.killRatio.length - 1) {
      return {
        kills: targetKills,
        deaths: targetDeaths,
      };
    }

    return {
      kills: Math.round(targetKills * killRatio),
      deaths: Math.round(targetDeaths * deathRatio),
    };
  });

  for (let i = 0; i < timeline.length; i++) {
    const previous = i > 0 ? timeline[i - 1] : { kills: 0, deaths: 0 };

    timeline[i].kills = clampNumber(timeline[i].kills, previous.kills, targetKills);
    timeline[i].deaths = clampNumber(timeline[i].deaths, previous.deaths, targetDeaths);

    if (i > 0 && i < timeline.length - 1) {
      if (timeline[i].kills === previous.kills && timeline[i].kills < targetKills) {
        timeline[i].kills += 1;
      }

      if (timeline[i].deaths === previous.deaths && timeline[i].deaths < targetDeaths) {
        timeline[i].deaths += 1;
      }
    }
  }

  timeline[timeline.length - 1] = {
    kills: targetKills,
    deaths: targetDeaths,
  };

  return timeline;
};

const getCommentaryState = (
  index: number,
  timeline: KillSnapshot[],
  userWin: boolean
): CommentaryState => {
  if (index === 0) return 'setup';
  if (index === timeline.length - 1) return userWin ? 'finalWin' : 'finalLoss';

  const current = timeline[index];
  const previous = timeline[index - 1];

  const currentDiff = current.kills - current.deaths;
  const previousDiff = previous.kills - previous.deaths;

  if (previousDiff <= -2 && currentDiff >= 0) return 'swingToPlayer';
  if (previousDiff >= 2 && currentDiff <= 0) return 'swingToOpponent';

  if (Math.abs(currentDiff) <= 1) return 'even';
  if (currentDiff > 1) return 'playerLead';
  return 'opponentLead';
};

const getEventTypeFromState = (state: CommentaryState, index: number): MatchEvent['type'] => {
  if (state === 'setup') return 'general';
  if (state === 'playerLead') return index % 2 === 0 ? 'objective' : 'kill';
  if (state === 'opponentLead') return index % 2 === 0 ? 'fight' : 'kill';
  if (state === 'even') return index % 2 === 0 ? 'objective' : 'general';
  if (state === 'swingToPlayer' || state === 'swingToOpponent') return index % 2 === 0 ? 'objective' : 'fight';
  return 'fight';
};

export default function MatchSimulatorView({
  draft,
  opponentTeamsList,
  currentRound,
  teamScore,
  synergyDetails,
  matchHistory = [],
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

  // Setup/Draw Match when round loads.
  // Rival variance rules:
  // 1) Never draw the exact same team + year already present in the user's draft.
  // 2) Never repeat a rival already faced in the same run, unless the pool becomes too small.
  useEffect(() => {
    const getTeamKey = (team: HistoricalTeam | { name: string; year: number }) =>
      `${team.name.trim().toLowerCase()}-${team.year}`;

    const draftedTeamKeys = new Set(
      (Object.values(draft) as { fromTeam: { name: string; year: number } | null }[])
        .map(slot => slot.fromTeam ? getTeamKey(slot.fromTeam) : null)
        .filter(Boolean) as string[]
    );

    const alreadyPlayedTeamKeys = new Set(
      matchHistory.map(match => getTeamKey({ name: match.opponentName, year: match.opponentYear }))
    );

    const applyVarianceRules = (teams: HistoricalTeam[], allowAlreadyPlayed = false) => {
      return teams.filter(team => {
        if (team.id === 'custom') return false;
        const key = getTeamKey(team);
        if (draftedTeamKeys.has(key)) return false;
        if (!allowAlreadyPlayed && alreadyPlayedTeamKeys.has(key)) return false;
        return true;
      });
    };

    const getBasePool = () => {
      if (gameMode === 'normal') {
        // Normal mode: only rosters that attended Worlds that exact year.
        return opponentTeamsList.filter(team => team.hasWorldsAppearance === true && team.id !== 'custom');
      }

      if (gameMode === 'lecHard') {
        if (currentRound < 3) {
          // Regional stage: only historic European rosters.
          return opponentTeamsList.filter(team => team.region === 'LEC' && team.id !== 'custom');
        }

        // International stage: Worlds-level non-Western giants.
        return opponentTeamsList.filter(team =>
          team.hasWorldsAppearance === true &&
          team.region !== 'LEC' &&
          team.region !== 'LCS' &&
          team.id !== 'custom'
        );
      }

      if (gameMode === 'lcsHard') {
        if (currentRound < 3) {
          // Regional stage: only historic North American LCS rosters.
          return opponentTeamsList.filter(team => team.region === 'LCS' && team.id !== 'custom');
        }

        // International stage: Worlds-level non-Western giants.
        return opponentTeamsList.filter(team =>
          team.hasWorldsAppearance === true &&
          team.region !== 'LEC' &&
          team.region !== 'LCS' &&
          team.id !== 'custom'
        );
      }

      return opponentTeamsList.filter(team => team.id !== 'custom');
    };

    const basePool = getBasePool();

    let validOpponents = applyVarianceRules(basePool, false);

    // If all teams were already played, relax the "already played" rule but still block teams from the user's draft.
    if (validOpponents.length === 0) {
      validOpponents = applyVarianceRules(basePool, true);
    }

    // Final fallback: keep the game alive, but still avoid the user's drafted exact team/year where possible.
    if (validOpponents.length === 0) {
      validOpponents = opponentTeamsList.filter(team => {
        if (team.id === 'custom') return false;
        return !draftedTeamKeys.has(getTeamKey(team));
      });
    }

    if (validOpponents.length === 0) {
      validOpponents = opponentTeamsList.filter(team => team.id !== 'custom');
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

    // Calculate difficulty modifiers
    let roundDifficultyBonus = currentRound * 1.5;

    if (gameMode === 'lecHard' || gameMode === 'lcsHard') {
      if (currentRound < 3) {
        // Regional playoffs stage: demanding, but not as punishing as Worlds.
        roundDifficultyBonus = currentRound * 2.5 + 1.5;
      } else {
        // International stage: LCK/LPL-level bosses.
        roundDifficultyBonus = currentRound * 3.2 + 2.5;
      }
    }

    const opponentFinalScore = Math.round(oAvg + roundDifficultyBonus);

    // Calculate win probability
    const scoreDiff = teamScore - opponentFinalScore;
    const baseWinChance = (gameMode === 'normal' ? 56 : 50) + (scoreDiff * 4.4);

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
  }, [currentRound, teamScore, opponentTeamsList, gameMode, draft, matchHistory]);

  if (!simulator) return null;

  // Compile match events dynamically using the generated kill timeline.
  // Messages are selected according to the actual score state, so the commentary follows the match flow.
  const generateMatchEvents = (
    userWin: boolean,
    opp: HistoricalTeam,
    killTimeline: KillSnapshot[]
  ): MatchEvent[] => {
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
    const transSet = LIVE_COMMENTARY[lang] || LIVE_COMMENTARY.es;

    const translateTemplate = (str: string, score: string) => {
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
        .replace(/{oppName}/g, oppName)
        .replace(/{score}/g, score);
    };

    return killTimeline.map((snapshot, index) => {
      const state = getCommentaryState(index, killTimeline, userWin);
      const score = `${snapshot.kills}-${snapshot.deaths}`;
      const message = translateTemplate(chooseRandom(transSet[state]), score);

      return {
        time: MATCH_TIMELINE[index] || `${String(index * 4).padStart(2, '0')}:00`,
        type: getEventTypeFromState(state, index),
        message,
      };
    });
  };

  const handleStartMatchSimulation = () => {
    if (simulator.status !== 'pending') return;

    // Run RNG simulation
    const dice = Math.random() * 100;
    const isPlayerWin = dice < simulator.winChance;

    const { targetKills, targetDeaths } = createFinalScoreline(
      isPlayerWin,
      simulator.playerScore,
      simulator.opponentScore
    );

    const killTimeline = buildKillTimeline(isPlayerWin, targetKills, targetDeaths);
    const compiledEvents = generateMatchEvents(isPlayerWin, simulator.opponent, killTimeline);

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

    let currentEventCursor = 0;
    const speed = 1300;

    const tick = () => {
      if (currentEventCursor < compiledEvents.length) {
        const eventToAdd = compiledEvents[currentEventCursor];
        const scoreSnapshot = killTimeline[currentEventCursor] || killTimeline[killTimeline.length - 1];

        setDisplayedEvents(prev => [...prev, eventToAdd]);

        currentEventCursor++;

        setSimulator(prev => {
          if (!prev) return null;

          return {
            ...prev,
            progress: Math.round((currentEventCursor / compiledEvents.length) * 100),
            currentKills: scoreSnapshot.kills,
            currentDeaths: scoreSnapshot.deaths,
          };
        });

        setTimeout(tick, speed);
      } else {
        setSimulator(prev => {
          if (!prev) return null;
          return {
            ...prev,
            status: isPlayerWin ? 'win' : 'loss',
            currentKills: targetKills,
            currentDeaths: targetDeaths,
          };
        });

        setIsPlayingEvents(false);
        setGameResultTriggered(true);

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
  const opponentDisplayName = `${simulator.opponent.name} ${simulator.opponent.year}`;

  const getRoleEmoji = (role: 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'coach') => {
    switch (role) {
      case 'top':
        return '⚔️';
      case 'jungle':
        return '🌿';
      case 'mid':
        return '🔮';
      case 'adc':
        return '🎯';
      case 'support':
        return '🛡️';
      case 'coach':
        return '🧠';
      default:
        return '•';
    }
  };

  const getRoleShortLabel = (role: 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'coach') => {
    switch (role) {
      case 'top':
        return 'TOP';
      case 'jungle':
        return 'JNG';
      case 'mid':
        return 'MID';
      case 'adc':
        return 'ADC';
      case 'support':
        return 'SUP';
      case 'coach':
        return lang === 'es' ? 'ENTR' : 'COACH';
      default:
        return role.toUpperCase();
    }
  };

  const getVsTitle = () => {
    switch (lang) {
      case 'es':
        return `MI EQUIPO VS ${opponentDisplayName.toUpperCase()}`;
      case 'fr':
        return `MON ÉQUIPE VS ${opponentDisplayName.toUpperCase()}`;
      case 'de':
        return `MEIN TEAM VS ${opponentDisplayName.toUpperCase()}`;
      case 'it':
        return `IL MIO TEAM VS ${opponentDisplayName.toUpperCase()}`;
      case 'pt':
        return `MINHA EQUIPE VS ${opponentDisplayName.toUpperCase()}`;
      case 'ru':
        return `МОЯ КОМАНДА VS ${opponentDisplayName.toUpperCase()}`;
      case 'ko':
        return `내 팀 VS ${opponentDisplayName.toUpperCase()}`;
      case 'zh':
        return `我的队伍 VS ${opponentDisplayName.toUpperCase()}`;
      default:
        return `MY TEAM VS ${opponentDisplayName.toUpperCase()}`;
    }
  };

  const getEmptySlotLabel = () => {
    switch (lang) {
      case 'es':
        return 'Sin jugador';
      case 'fr':
        return 'Vide';
      case 'de':
        return 'Leer';
      case 'it':
        return 'Vuoto';
      case 'pt':
        return 'Vazio';
      case 'ru':
        return 'Пусто';
      case 'ko':
        return '비어 있음';
      case 'zh':
        return '空位';
      default:
        return 'Empty';
    }
  };

  const matchupRows = ([
    { role: 'top', userSlot: draft.top, opponentPlayer: simulator.opponent.roster.top },
    { role: 'jungle', userSlot: draft.jungle, opponentPlayer: simulator.opponent.roster.jungle },
    { role: 'mid', userSlot: draft.mid, opponentPlayer: simulator.opponent.roster.mid },
    { role: 'adc', userSlot: draft.adc, opponentPlayer: simulator.opponent.roster.adc },
    { role: 'support', userSlot: draft.support, opponentPlayer: simulator.opponent.roster.support },
    { role: 'coach', userSlot: draft.coach, opponentPlayer: simulator.opponent.roster.coach },
  ] as const).map(row => ({
    ...row,
    icon: getRoleEmoji(row.role),
    label: getRoleShortLabel(row.role),
    userName: row.userSlot.player?.name || getEmptySlotLabel(),
    userRating: row.userSlot.player?.rating ?? '-',
    opponentName: row.opponentPlayer.name,
    opponentRating: row.opponentPlayer.rating,
  }));


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
            {localizedRoundTitle} VS {opponentDisplayName.toUpperCase()}
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
            <span className="font-mono text-[10px]">{lang === 'es' ? 'QUÍMICAS COMPARTIDAS:' : 'ACTIVE SYNERGIES:'}</span>
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
        <div id="opponent-roster-spec-details" className="bg-[#050c14]/90 border border-[#c8aa6e]/10 rounded-2xl p-4 sm:p-5 shadow-md flex-1">
          <h4 className="text-[10px] font-black text-[#c8aa6e] tracking-widest uppercase mb-3 flex items-center gap-1">
            <span>⚔️</span> {getVsTitle()}
          </h4>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-2 pb-2 text-[8px] text-[#a09b8c] font-black uppercase tracking-widest border-b border-[#c8aa6e]/10">
            <span>{lang === 'es' ? 'Mi roster' : 'My roster'}</span>
            <span className="text-center">VS</span>
            <span className="text-right">{simulator.opponent.name} {simulator.opponent.year}</span>
          </div>

          <div className="flex flex-col gap-2 font-mono text-[11px] sm:text-xs mt-2">
            {matchupRows.map(row => (
              <div
                key={row.role}
                className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2 border-b border-[#c8aa6e]/5 text-[#a09b8c] last:border-b-0"
              >
                <div className="min-w-0 text-left">
                  <div className="text-[#f0e6d2] font-semibold truncate">{row.userName}</div>
                  <div className="text-[9px] text-[#c8aa6e]/80 font-black">OVR {row.userRating}</div>
                </div>

                <div className="shrink-0 text-center px-2 py-1 rounded-lg bg-[#010a13] border border-[#c8aa6e]/15 text-[#c8aa6e] font-black min-w-[54px]">
                  <div className="leading-none">{row.icon}</div>
                  <div className="text-[8px] tracking-widest mt-1">{row.label}</div>
                </div>

                <div className="min-w-0 text-right">
                  <div className="text-[#f0e6d2] font-semibold truncate">{row.opponentName}</div>
                  <div className="text-[9px] text-red-400/90 font-black">OVR {row.opponentRating}</div>
                </div>
              </div>
            ))}
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
                {opponentDisplayName}
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
                {lang === 'es' ? 'SISTEMA DE TRANSMISIONES DE LA GRIETA DISPONIBLE' : 'WARP SUMMON CHANNELS READY'}
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

              {(simulator.status === 'win' || simulator.status === 'loss') && (
                <ExoClickAd
                  placement="outstreamResult"
                  subId={`match_result_round_${currentRound + 1}_${simulator.status}`}
                  className="my-2"
                  minHeight={280}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
