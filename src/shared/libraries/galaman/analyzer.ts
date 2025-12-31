/* ------------------------- Açıklama ------------------------- *\

    Galaman'ın fonksiyonlarını kullanarak en iyi hamleyi aramak
  yerine tüm hamleleri değerlendirip sınıflandıran bir sistem
  modülü.

\* ------------------------- Açıklama ------------------------- */




/* -------- İçe aktarımlar -------- */


import { getAvailableMoves,
simulateMove,
type Board,
type Move, 
type Player} from "../../modules/mancala";
import { defaultWeights,
movePriority,negamax, 
type galamanWeights} from ".";


/* -------- İçe aktarımlar -------- */




/* -------- Tip tanımları -------- */


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


/* -------- Tip tanımları -------- */




/* -------- Değişkenler ve sabitler -------- */


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


/* -------- Değişkenler ve sabitler -------- */




/* -------- Fonksiyonlar -------- */


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
    
    galaManAnalyser
}


/* -------- Dışa aktarmalar -------- */