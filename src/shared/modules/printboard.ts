import type { Board, Player } from "./mancala";

export function printPlayerTurn(player: Player, logger: Function = console.log): void {
    logger((player + 1) + ". oyuncunun sırası.");
}

export function printBoard(board: Board, flipped?: any, logger: Function = console.log): void {
    /* `
    ₆  ₅  ₄   ₃  ₂  ₁
    4  4  4   4  5  5
 12                   22
    4  4  4   10 12 6
    ¹  ²  ³   ⁴  ⁵  ⁶
`
    tahta böyle birşey olacak. */

    // vallaha şu kodu yazmayı çalışana kadar padEnd'den haberim yoktu, bayağı kullanışlıymış.
    const id = (n: number): string => String(board[n]).padEnd(2, " ");

    // normalde 1. oyuncunun bakış açısından yazdırıyor. eğer flipped
    // değeri true ise 2. oyuncunun bakış açısından yazdırıyor.

    // "%d %d %d" gibi yazmanın bir yolu var mı aceba? neyse şimdilik böyle idare edicem.
    const output: string = !flipped ? `    ₆  ₅  ₄   ₃  ₂  ₁
    ${id(12)} ${id(11)} ${id(10)}  ${id(9)} ${id(8)} ${id(7)}
 ${id(13)}                    ${id(6)}
    ${id(0)} ${id(1)} ${id(2)}  ${id(3)} ${id(4)} ${id(5)}
    ¹  ²  ³   ⁴  ⁵  ⁶` : `    ₆  ₅  ₄   ₃  ₂  ₁
    ${id(5)} ${id(4)} ${id(3)}  ${id(2)} ${id(1)} ${id(0)}
 ${id(6)}                    ${id(13)}
    ${id(7)} ${id(8)} ${id(9)}  ${id(10)} ${id(11)} ${id(12)}
    ¹  ²  ³   ⁴  ⁵  ⁶`

    logger(output);
}
