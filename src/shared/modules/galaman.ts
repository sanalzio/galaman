/* ------------------------- Açıklama ------------------------- *\

    Bu modül, mangala oyunu için bir yapay zeka (bot) sistemi
  için yazıldı. Algoritma olarak negamax alpha-beta budama sistemi
  kullandım. Wikipeida: (https://en.wikipedia.org/wiki/Negamax)

\* ------------------------- Açıklama ------------------------- */




/* -------- İçe aktarımlar -------- */


import type {
    Move, Player, Board,
    StoreIndex
} from "./mancala";

import {
    seedCountInPlayerPits,
    evaluateStoresDiff,
    getAvailableMoves,
    getMovePitIndex,
    getOtherPlayer,
    simulateMove,
    getPlayerStoreIndex,

    BadMoveError
} from "./mancala";

import { galamanIddiot, galamanEasy, galamanMedium, galamanHard } from "./simplegalaman";


/* -------- İçe aktarımlar -------- */




/* -------- Tip tanımları -------- */


// ağırlıklar yapay zekanın oyunun anlık halinin hangi
// oyuncu için kaç puan aldığını hesaplamak içinler.
// mangala oyununda sadece hazine farklarına bakarak
// oyunun gidişatını göremediğimiz için, ektra hamle,
// çifleme hamlesi, yakalama hamlesi tehtid miktarı
// gibi değerlere bakıp onlara ağırlıklar verip durumu
// değerlendirmemiz gerekiyor. ağırlıklar bunun için.
type galamanWeights = {
    store: number; // bu hazineler farkı
    pits: number; // oyuncu tarafındaki kuyulardaki taş farkı
    capture: number; // yakalama hamlesi ihtimali
    doubling: number; // çiftleme hamlesi ihtimali
    extra: number; // ekstra hamle kazanma ihtimali
    vuln: number; // rakibin maksimum kazanabileceği taş sayısı.
};


// transposition table (TT) sistemi için kayıt verisi tipi.
// TT sistemi, yapay zeka oyun olasılıklarına bakarak
// çalıştığı için eğer aynı oyun olasılığıyla karşılaşırsa
// direk kaydettiği değeri alması ile bellekten bir
// miktar kayıp cpu'dan kazanç sağlamak için bir sistem.
type TTEntry = {
    value: number;
    depth: number;
};


type MoveClasses = (
      "Dahice"
    | "En iyisi"   //  3
    | "İyi"        //  2
    | "İlginç"     //  1
    | "Yanlış"     // -1
    | "Hatalı"     // -2
    | "Büyük hata" // -3
    | "Sazan"      // -4
    | "Mecburi"    // -5
    | "Normal"     //  0
);
// "En iyisi" hamlesinin yanında birde "Dahice" var? evet var ama "Dahice"nin hesaplama sistemi
// Sığ baktığımızda en iyi gibi gözükmeyip, derin baktığımızda en iyi hamle olan hamleler
// olarak hesaplanıyor. "Sazan" hamlesi de tam tersi: Sığ bakışta artılı değer iken, derin
// bakışta eksili değer alıyor.

type MoveRating = 4|3|2|1|0|-1|-2|-3|-4|-5;

type MoveAnalysis = {

    value: number;
    shallowValue: number;
    moveRating: MoveRating;
    /* label: MoveClasses;
    color: string; */
};

type MoveAnalyses = Partial<Record<Move, MoveAnalysis>>

type MoveValueObject = Partial<Record<Move, number>>

type MoveColorsObject = Record<MoveRating, string>;


type galamanDifficulty = 0|1|2|3;


/* -------- Tip tanımları -------- */




/* -------- Değişkenler ve sabitler -------- */


const transpositionTable = new Map<number, TTEntry>();

const defaultWeights: galamanWeights = {
    store: 1.0,
    pits: 0.2,
    capture: 1.2, // yakalama ile çiftleme aynı çünkü ikisi benzer hamleler
    doubling: 1.2, // ve bir hamlede sadece ikisinden birini yapabilirsiniz.
    extra: 0.9,
    vuln: -0.6
}

const moveRatingLabels: Partial<Record<MoveRating, MoveClasses>> = {
    4: "Dahice",
    3: "En iyisi",
    2: "İyi",
    1: "İlginç",
    0: "Normal",
    "-1": "Yanlış",
    "-2": "Hatalı",
    "-3": "Büyük hata",
    "-4": "Sazan", // bu ikisine en büyük eksi değerleri verdim ama en kötü hamleler falan
    "-5": "Mecburi" // değiller. sadece olumlu da olmadıkları için eksili değer verdim.
}

const moveColors: MoveColorsObject = {
    4: "#0b7285",
    3: "#087f5b",
    2: "#0d9423",
    1: "#5c940d",
    0: "#ddd",
    "-1": "#e67700",
    "-2": "#d9480f",
    "-3": "#c92a2a",
    "-4": "#d19761",
    "-5": "#ddd"
}

const galamanVersion = "0.0.1";

const galamanDifficultyName = [
    "çok kolay",
    "kolay",
    "orta",
    "zor"
]


/* -------- Değişkenler ve sabitler -------- */




/* -------- Fonksiyonlar -------- */


// verilen tahtada, verilen oyuncunun üst üste kaç tane ekstra
// hamle, yakalama hamlesi ve çiftleme hamlesi yapabildiğini ölçer.
function estimateGoldMoves(board: Board, player: Player):
{ extraTurns: number, capture: boolean, doubling: boolean } {

    // zaten simulationMove kullanmıyor musun neden koplyaladın? ekstra
    // hamle bulduktan sonra tekrar başka altın hamleler var mı diye
    // bakmak için ve orjinal tahtada değişiklik yapmamak için kopyalıyoruz.
    let virtualBoard: Board = new Uint8Array(board) as Board,
        extraTurns: number = 0,
        capture: boolean, // bir tane bulduysa tamam, başka
        doubling: boolean; // bulamaz zaten.

    // hiç ekstra hamle bulamayana kadar döngüde
    while (true) {
        // ekstra döngü buldun mu?
        let found: boolean = false;

        // sondan başlayarak tüm kuyuların, oynanması durumunda
        // ekstra hamle ile sonuçlanıp sonuçlanmayacağını ölçüyor
        for (let move: Move = 6; move >= 1; move--) {
            /* Neden sondan başladığını belki bu tahta
                          örneğinden anlayabilirsiniz:
                2  3  4   5  0  7
            0                     0
                7  6  5   4  3  2
                ¹  ²  ³   ⁴  ⁵  ⁶
            */

            // eğer kuyu boşsa atla
            if (!virtualBoard[getMovePitIndex(player, move as Move)]) continue;

            const { board: newBoard, nextPlayer, isCaptureMove, isDoublingMove } = (
                simulateMove(player, move as Move, virtualBoard)
            );

            // yani bu bir ekstra hamle mi kazandırıdı?
            if (nextPlayer == player) {
                extraTurns++,
                virtualBoard = newBoard,
                found = true;
                break;
                // artık extra hamleyi bulup onu oynadığımız için
                // aynı tahtada ekstra hamle arayamayız, bu yüzden
                // bu döngüyü sonlandır ve sonraki döngüde tekrar
                // ekstra hamle ara.
            }

            capture = isCaptureMove;
            doubling = isDoublingMove;
        }

        // daha fazla ekstra hamle bulamadıysan çık döngüden.
        if (!found) break;
    }

    return { extraTurns, capture, doubling };
}



// verilen tahtada, verilen oyuncu rakip
// tarafından ne kadar hasara uğratılabilir?
function estimateVulnerability(board: Board, player: Player): number {

    const oppPlayer = getOtherPlayer(player),
          oppStoreIndex = getPlayerStoreIndex(oppPlayer),
          oppStoreValue = board[oppStoreIndex];

    const maxOppGain = estimateVulnLoop(board, 0, oppPlayer, oppStoreIndex, oppStoreValue);

    return maxOppGain;
}

function estimateVulnLoop(nowBoard: Board, maxOppGain: number, oppPlayer: Player, oppStoreIndex: StoreIndex, oppStoreValue: number) {

    for (let move: Move = 6; move >= 1; move--) {

        // eğer kuyu boşsa atla (her seferinde bunu yazıyorum çünkü
        // bu satırlar her seferinde bayağı karmaşık duruyor.)
        if (!nowBoard[getMovePitIndex(oppPlayer, move as Move)]) continue;

        const { board: newBoard, nextPlayer } = (
            simulateMove(oppPlayer, move as Move, nowBoard)
        );

        if (nextPlayer == oppPlayer) {
            return estimateVulnLoop(newBoard, newBoard[oppStoreIndex] - oppStoreValue, oppPlayer, oppStoreIndex, oppStoreValue);
        }

        maxOppGain = Math.max(maxOppGain, newBoard[oppStoreIndex] - oppStoreValue);
    }

    return maxOppGain;
}



// verilen durumda oyuncunun pozisyon skoru (negamax için)
function evaluate(board: Board, player: Player, weights: galamanWeights = defaultWeights) {

    // normalize etmek için herhagi bir sabit
    // (toplam taş sayısını kullandım)
    const TOTAL = 48;

    // oyuncunun hazinesi ile rakibinin hazinesi arasındaki fark
    const storeDiff = evaluateStoresDiff(board, player);

    // oyuncuların hazine dışındaki kuyularında bulunan toplam taş sayısı
    const myPits = seedCountInPlayerPits(board, player);
    const oppPits = seedCountInPlayerPits(board, getOtherPlayer(player));

    const { extraTurns, capture, doubling } = estimateGoldMoves(board, player);
    const vuln = estimateVulnerability(board, player);

    const raw =  weights.store * storeDiff
            + weights.pits * (myPits - oppPits)
            + weights.extra * extraTurns
            + weights.doubling * (doubling ? 1 : 0)
            + weights.capture * (capture ? 1 : 0)
            + weights.vuln * vuln;

    // "normal" değerine bölüyoruz.
    return raw / TOTAL;
}


// hamlenin önceliğini belirliyor. evaluate'den farkı ne? evaluate durumun oyuncu için değerini hesap-
// larken, movePriority ise hamlenin değerini yapay zeka olmadan, sadece değerlere bakarak hesaplıyor.
function movePriority(board: Board, move: Move, player: Player): number {

    const { nextPlayer, isCaptureMove, isDoublingMove, gain } = (
        simulateMove(player, move, board)
    );

    let score = 0;

    // eğer ekstra hamle elde edildiyse
    if (nextPlayer == player) score += 100;

    // hamlenin, çalma hamlesi veya çifleme olup olmadığını
    // kontrol ediyor. yani son taşı ile kendi boş kuyularından
    // birini doldurup karşı kuyudakileri alma veya karşı tarafın
    // kuyularından birinin taş sayısını son taş ile çift sayılı
    // hale getirince kuyunun tamamının içeriğini alma hamlesi.
    // || yani "veya" kullandım çünkü önceden dediğim gibi bir hamle
    // ile bu hamleler ikisini birden gerçekleştirmek mümkün değil.
    if (isCaptureMove || isDoublingMove) score += 80;

    if (gain > 0) score += gain < 3 || gain == 30 ? 30 : gain *10;

    return score;

}


// transposition table'a kayıt etmek için tahtayı hash'liyor
// string olarak hash'lemekten daha hızlı olması için FNV-1a
// diye bir algoritma kullandım
function hashBoard(board: Board, player: Player): number {
    let hash = 2166136261; // FNV offset basis (32-bit)

    // Tahtadaki 14 hücreyi işle.
    for (let i = 0; i < 14; i++) {
        hash ^= board[i];
        // Math.imul, 32-bit tamsayı çarpımı yapıyormuş.
        hash = Math.imul(hash, 16777619);
    }

    // 15. eleman olarak oyuncu bilgisini işle.
    hash ^= player;
    hash = Math.imul(hash, 16777619);

    return hash >>> 0; // Pozitif (uint) 32-bit tamsayıya dönüştür.
}
// vallaha bu tarz operatörler görmüşlüğüm yok,
// biryerlerden rastgele ypıştırılıp düzenlenmiş kod parçacığı.


// negamax algoritması (https://en.wikipedia.org/wiki/Negamax)
// 17 yaşındaki bir velet olarak az biraz da olsa anladım işte.
function negamax(
    board: Board,
    player: Player,
    depth: number,
    alpha: number,
    beta: number,
    isTerminal: boolean,
    exactDepthOnly: boolean = false
): number {

    const hash = hashBoard(board, player);
    const ttEntry = transpositionTable.get(hash);

    if (
        ttEntry && (
            exactDepthOnly
            ? ttEntry.depth == depth
            : ttEntry.depth >= depth
        )
    ) {
        return ttEntry.value;
    }

    if (isTerminal) {
        const value = evaluateStoresDiff(board, player);
        transpositionTable.set(hash, { value, depth });
        return value;
    }

    // depth == 0 (ben nedense böyle kullanmayı biraz
    // havalı buluyorum o yüzden böyle yani.)
    if (!depth) {
        const value = evaluate(board, player);
        transpositionTable.set(hash, { value, depth });
        return value;
    }

    const moves = getAvailableMoves(board, player);
    moves.sort((a: Move, b: Move) => movePriority(board, b, player) - movePriority(board, a, player));

    let value = -Infinity;
    for (const m of moves) {
        const { board: newBoard, nextPlayer, gameOver } = simulateMove(player, m, board);
        let score: number;

        // bu parantez olmayan if'ler de !depth ile aynı sebepten.
        if (nextPlayer == player)
            score = negamax(newBoard, player, depth - 1, alpha, beta, gameOver, exactDepthOnly);
        else
            score = -negamax(newBoard, nextPlayer, depth - 1, -beta, -alpha, gameOver, exactDepthOnly);

        value = Math.max(value, score);
        alpha = Math.max(alpha, score);

        if (alpha >= beta) {
            break;
        }
    }

    transpositionTable.set(hash, { value, depth });
    return value;
}


function findBestMove(
    board: Board,
    player: Player,
    depth: number,
    exactDepthOnly?: boolean
): Move {

    const moves: Move[] = getAvailableMoves(board, player);

    // bir tane varsa onu oynayacak zaten.
    if (moves.length == 1) return moves[0];

    moves.sort((a: Move, b: Move) => movePriority(board, b, player) - movePriority(board, a, player));

    let bestValue = -Infinity,
        bestMove: Move,
        alpha = -Infinity,
        beta = Infinity;

    for (const move of moves) {
        const { board: newBoard, nextPlayer, gameOver } = simulateMove(player, move, board);
        let value: number;

        if (nextPlayer == player) {
            value = negamax(newBoard, player, depth - 1, alpha, beta, gameOver, exactDepthOnly);
        } else {
            value = -negamax(newBoard, nextPlayer, depth - 1, -beta, -alpha, gameOver, exactDepthOnly);
        }

        if (value > bestValue) {
            bestValue = value,
            bestMove = move;
        }

        alpha = Math.max(alpha, value);
    }

    if (bestMove == undefined) {
        throw new BadMoveError("Belirtilen kuyu boş.");
    }

    return bestMove;
}




// buradan aşağısı hamle analiz sistemleri

// bu fonksiyon değeri en yüksek olan hamleyi bulmak
// yenine tüm hamlelerin değerlerini ölçüp döndürüyor.
function evaluateMoves(
    board: Board,
    player: Player,
    avalibleMoves: Move[],
    depth: number,
    exactDepthOnly: boolean = false
): { bestValue: number, bestMove: Move, moves: MoveValueObject } {

    const results: Partial<Record<Move, number>> = new Object();

    let alpha = -Infinity,
        beta = Infinity,
        bestValue = -Infinity,
        bestMove: Move;

    for (const move of avalibleMoves) {
        const { board: newBoard, nextPlayer, gameOver } = simulateMove(player, move, board);
        let value: number;

        if (nextPlayer === player) {
            value = negamax(newBoard, player, depth - 1, alpha, beta, gameOver, exactDepthOnly);
        } else {
            value = -negamax(newBoard, nextPlayer, depth - 1, -beta, -alpha, gameOver, exactDepthOnly);
        }

        results[move] = value,
        bestValue = Math.max(bestValue, value),
        alpha = Math.max(alpha, value);

        if (bestValue == value) bestMove = move;
    }

    return { bestValue, bestMove, moves: results };
}



// burada hamlelerin farklı durumlar altındaki değerlerini alıp
// analiz edip etiketleyip döndürüyoruz. ana analiz fonksiyonu bu.
function analyseMoves(
    board: Board,
    player: Player,
    depth: number,
    shallowDepth: number
): { moves: MoveAnalyses, best: { move: Move, value: number} } {

    const results: MoveAnalyses = new Object();

    const moves = getAvailableMoves(board, player);

    // bir tane hamle varsa,
    if (moves.length == 1) {

        results[moves[0]] = {

            value: 0,
            shallowValue: 0,
            moveRating: -5
        };

        return { moves: results, best: {
                move: moves[0],
                value: 0
            }
        };
    }

    moves.sort((a, b) => movePriority(board, b, player) - movePriority(board, a, player));

    // satranç motorlarına oyun analizleri yaptırdığınızda bazı hamlelere "best" derken,
    // bazılarına ise "brilliant" dediklerine şahit olmuşsunuzdur. yani çoğu kişi best tamam
    // da brilliant ne acep der işte brilliant'ın sırrı eğer sığ baktığımızda best gözükmeyip
    // derin baktığımızda best gözüken bir hamle oynadıysanız bu brilliant olarak etiketleniyor.
    // ve bunu ölçmek için de işte alttaki bu iki satırda bir sığ (shallow) birde derin (deep)
    // olmak üzere iki arama yaparak değerlendiriyoruz.
    const shallowAnalyse = evaluateMoves(board, player, moves, shallowDepth, true),
          deepAnalyse = evaluateMoves(board, player, moves, depth);

    for (const move of moves) {

        const moveRating = rateMove(
            deepAnalyse.bestValue,
            shallowAnalyse.bestValue,
            deepAnalyse.moves[move],
            shallowAnalyse.moves[move]
        );

        results[move] = {
            value: deepAnalyse.moves[move],
            shallowValue: shallowAnalyse.moves[move],
            moveRating
        }
    }

    return { moves: results, best: {
                move: deepAnalyse.bestMove,
                value: deepAnalyse.bestValue
            }
        };
}



function rateMoveBase(best: number, value: number): MoveRating {
    const BASELINE = 0.1;

    const denom = Math.max(Math.abs(best), BASELINE);
    const lossRatio = (best - value) / denom;

    if (!lossRatio) return 3;
    if (lossRatio < 0.03) return 2;
    if (lossRatio < 0.15) return 1;
    if (lossRatio < 0.35) return 0;
    if (lossRatio < 0.50) return -1;
    if (lossRatio < 0.80) return -2;
    return -3;
}


function rateMove(
    deepAnalyseBest: number,
    shallowAnalyseBest: number,
    deepAnalyseValue: number,
    shallowAnalyseValue: number
): MoveRating {

    const shallowAnalyseRating = rateMoveBase(shallowAnalyseBest, shallowAnalyseValue);
    const deepAnalyseRating = rateMoveBase(deepAnalyseBest, deepAnalyseValue);

    // sığ aramada "en iyisi" değil ama derin aramada öyle
    if (shallowAnalyseRating < 2 && deepAnalyseRating == 3)
        return 4; // "Dahice"

    // sığ aramada pozitif, derin aramada negatif hamle
    if (
        shallowAnalyseRating > 0 &&
        deepAnalyseRating < 0
    )
        return -4; // "Sazan"

    return deepAnalyseRating;
}


/* -------- Fonksiyonlar -------- */




/* -------- Sınıflar -------- */


// bot oyuncu class objesi ana API bu.
class galaMan {

    // orjinalleri üzerinde değişiklik olmaması için kopyalıyoruz.
    weights: galamanWeights = {...defaultWeights}
    depth = 10;
    difficulty: galamanDifficulty;

    // bir etkisi yok, üstver (metadata) için.
    name = "galaMan v" + galamanVersion;


    constructor(
        options: {
            difficulty?: galamanDifficulty
            depth?: number,
            weights?: galamanWeights
        } = {}
    ) {

        if (options.weights) this.weights = { ...this.weights, ...options.weights };

        if (options.difficulty != undefined) {

            this.difficulty = options.difficulty,

            this.name = this.name + (
                this.difficulty >= 0 && this.difficulty <= 3
                ? ` (${galamanDifficultyName[this.difficulty]})`
                : ` (${galamanDifficultyName[3]})`
            );
        }

        if (options.depth) {

            this.depth = options.depth,
            this.difficulty = undefined,

            this.name = this.name + ` (depth: ${this.depth})`;
        }

        transpositionTable.clear();
    }


    getMove(board: Board, player: Player): Move {

        if (this.difficulty == undefined)
            return findBestMove(board,
                player,
                this.depth,
                true
            );

        switch (this.difficulty) {

            case 0: return galamanIddiot(board, player);

            case 1: return galamanEasy(board, player);

            case 2: return galamanMedium(board, player);

            default: return galamanHard(board, player);
        }
    }
}



class galaManAnalyser {

    weights: galamanWeights = {...defaultWeights}
    depth: number = 10;
    shallowDepth: number = 4;


    constructor(
        options: {
            depth?: number,
            shallowDepth?: number,
            weights?: galamanWeights
        } = {}
    ) {

        if (options.depth) {
            this.depth = options.depth
            this.shallowDepth = options.shallowDepth || Math.max(3, Math.floor(options.depth * 0.4));
        }

        if (options.weights) this.weights = { ...this.weights, ...options.weights };

        /// transpositionTable.clear();
    }



    analyseMoves(board: Board, player: Player):
        { moves: MoveAnalyses, best: { move: Move, value: number} }
    {
        return analyseMoves(board, player, this.depth, this.shallowDepth);
    }

    // ikisi arasındaki fark: yukarıdaki fonksiyonun isminin sonunda "s" karakteri var ve
    // verilen tahtada, verilen oyuncunun oynayabileceği tüm hamlelere değer biçip döndürürken;
    // alttaki fonksiyonun ismininin sonunda "s" karakteri eksik olmasının yanında yukarıdaki
    // fonksiyonun verisinden belirtilen hamlenin değerlendirmesi ile en iyi hamleyi ayıklayıp döndürüyor.

    analyseMove(board: Board, player: Player, move: Move): { move: MoveAnalysis, bestMove: Move } {
        const { moves, best } = this.analyseMoves(board, player);
        return { move: moves[move], bestMove: best.move };
    }

}


/* -------- Sınıflar -------- */





/* -------- Dışa aktarmalar -------- */


export {
    moveRatingLabels, moveColors,
    galamanVersion,
    movePriority, estimateGoldMoves,
    galaMan, galaManAnalyser
};


/* -------- Dışa aktarmalar -------- */
