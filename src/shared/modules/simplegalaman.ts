/* -------------------------- Açıklama -------------------------- *\

    Fark ettim ki bu negamax için depth'i ne kadar düşürsek de
  gayet ortalama üstü bir performans gösteriyor. Bu yüzden başka
  bir zorluk seviyesi için basit bot algoritmaları yazdım.

\* -------------------------- Açıklama -------------------------- */




/* -------- İçe aktarımlar -------- */


import { estimateGoldMoves, movePriority } from "./galaman";
import { evaluateStoresDiff, getAvailableMoves, simulateMove, BadMoveError, getMovePitIndex } from "./mancala";
import type { Board, Player, Move } from "./mancala";


/* -------- İçe aktarımlar -------- */




/* -------- Fonksiyonlar -------- */


// dümdüz rastgele hamle yapıyor.
function galamanIddiot(board: Board, player: Player): Move {

    const moves = getAvailableMoves(board, player);

    // bir tane varsa onu oynayacak zaten.
    if (moves.length == 1) return moves[0];

    return moves[Math.floor(Math.random() * moves.length)];
}




// basit ie orta modda, basite yakın bir bot sistemi. biraz
// rasgeleliğe dayandığı için ortalama oyun bile çıkartabiliyor.
function galamanEasy(board: Board, player: Player): Move {

    const moves = getAvailableMoves(board, player);

    if (moves.length == 1) return moves[0];

    const chance = Math.random();

    // %50 ihtimalle hazineye en uzak kuyuyu oyna (orta okulda arkadaşımın
    // birisi, "Mangalada arkanı temizleyerek kazanırsın." demişti, bu yüzden.)
    if (chance < 0.50) {
        return Math.min(...moves) as Move; 
    }

    // %35 ihtimalle en az taşı olan kuyuyu oyna
    if (chance < 0.85) {
        return moves
            .reduce(
                (minMove: Move, currMove: Move) => {
                    const currentMoveIndex = getMovePitIndex(player, currMove);
                    return (
                        board[getMovePitIndex(player, minMove)] > board[currentMoveIndex]
                        ? currMove
                        : minMove
                    );
                },
                moves[0]
            )
    }

    // %15 ihtimalle rastgele bir hamle yap
    return moves[Math.floor(Math.random() * moves.length)];
}




// orta seviye. basitçe olası ekstra hamle
// sayısı ile yakalama veya çiftleme hamlesinin
// varlığını 10 ile çarpıp değerleri toplayarak
// en değerli hamleyi buluyor.
function galamanMedium(board: Board, player: Player): Move {

    const moves = getAvailableMoves(board, player);

    if (moves.length == 1) return moves[0];

    let bestValue: number = 0,
        bestMove: Move = moves[0];

    for (const move of moves) {

        const { extraTurns, capture, doubling } = estimateGoldMoves(board, player),
              value = (
                extraTurns*10
                + (
                    capture || doubling
                    ? 10
                    : 0
                )
            )

        if (value > bestValue) {
            bestValue = value,
            bestMove = move
        }
    }

    return bestMove;
}




// sadece bir el (ekstra hamleler dahil) kadarındaki hamle değerini hesaplayan
// min fonksiyonu olmayan negamax/minimax algoritması. yani minimax depth = 1
// gibi birşey ama depth her katmanda değil eher oyuncu surası değişikliğinde
// azalıyor. Bu sayede ekstra hamleler yaparak en kazançlı olabileceği hamleyi
// buluyor.
function justOneTurnMax(
    board: Board,
    player: Player,
    depth: number = 1,
    alpha: number,
    beta: number,
    isTerminal: boolean
): number {

    if (!depth || isTerminal) {
        const value = evaluateStoresDiff(board, player);
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
            score = justOneTurnMax(newBoard, player, depth, alpha, beta, gameOver);
        else
            score = -justOneTurnMax(newBoard, nextPlayer, depth - 1, -beta, -alpha, gameOver);

        value = Math.max(value, score);
        alpha = Math.max(alpha, score);

        if (alpha >= beta) {
            break;
        }
    }

    return value;
}


// bu fonksiyon'da üstteki fonksiyonun tetikleyicisi.
function galamanHard(
    board: Board,
    player: Player
): Move {

    const moves: Move[] = getAvailableMoves(board, player);

    if (moves.length == 1) return moves[0];

    moves.sort((b: Move, a: Move) => movePriority(board, b, player) - movePriority(board, a, player));

    let bestValue = -Infinity,
        bestMove: Move,
        alpha = -Infinity,
        beta = Infinity;

    for (const move of moves) {
        const { board: newBoard, nextPlayer, gameOver } = simulateMove(player, move, board);
        let value: number;

        if (nextPlayer == player) {
            value = justOneTurnMax(newBoard, player, 1, alpha, beta, gameOver);
        } else {
            value = -justOneTurnMax(newBoard, nextPlayer, 0, -beta, -alpha, gameOver);
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


/* -------- Fonksiyonlar -------- */





/* -------- Dışa aktarmalar -------- */


export { galamanIddiot, galamanEasy, galamanMedium, galamanHard };


/* -------- Dışa aktarmalar -------- */