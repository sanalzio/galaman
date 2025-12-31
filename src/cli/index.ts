/* -------- İçe aktarımlar -------- */


import { readInt } from "./modules/readline";

import { printBoard } from "../shared/modules/printboard";

import { Mancala, type Move, BadMoveError, type Board } from "../shared/modules/mancala";
import { galaMan } from "../shared/libraries/galaman";
import { galaManAnalyser, moveColors, moveRatingLabels } from "../shared/libraries/galaman/analyzer";


/* -------- İçe aktarımlar -------- */




/* -------- Ana fonksiyon -------- */


async function main(): Promise<number|void> {

    const game = new Mancala();

    game.setPlayer(); // rastgele oyuncu

    const botPlayer = new galaMan({ depth: 12 });
    const analyser = new galaManAnalyser({ depth: 12 });

    game.setPlayerName(0, "Sanalzio");
    game.setPlayerName(1, botPlayer.name);

    // console.clear();

    while (!game.isTerminal) {

        if (!game.player) {

            while(!game.player && !game.isTerminal) {

                // console.clear();
                printBoard(game.board);

                const move: Move = await readInt("Player " + (game.player + 1) + " > ") as Move;

                try {

                    const boardBeforeMove = new Uint8Array(game.board) as Board,
                          playerBeforeMove = game.player;

                    game.makeMove(move);

                    const { move: moveAnalyse, bestMove } = analyser.analyseMove(boardBeforeMove, playerBeforeMove, move),
                          moveLabel = moveRatingLabels[moveAnalyse.moveRating],
                          moveColor = moveColors[moveAnalyse.moveRating];

                    console.log(
                        "Hamle değerlendirmesi:",
                        (
                            moveLabel == "En iyisi"
                            ? Bun.color(moveColor, "ansi-16m") + moveLabel + "\x1b[0m"
                            : (
                                Bun.color(moveColor, "ansi-16m") +
                                moveLabel +
                                "\x1b[0m" +
                                " | En iyi hamle: " +
                                bestMove
                            )
                        )
                    );

                } catch (err) {

                    if (err instanceof BadMoveError)
                        continue;

                    else throw err;
                }
            }
        }



        if (game.player) {
            while(game.player && !game.isTerminal) {

                // console.clear();
                printBoard(game.board);
                console.write("Player 2 > ");

                const botMove: Move = botPlayer.getMove(game.board, game.player);

                console.write(botMove.toString() + "\n");
                game.makeMove(botMove);
            }
        }
    }

    // console.clear();
    printBoard(game.board);

    console.log(game.winner != undefined ? "Player " + (game.winner + 1) + "'s won!" : "Draw!");

    await Bun.write(`./gamesaves/game-${new Date().getTime()}.pmgn`, game.exportPMGN());

}


process.exit( await main() || 0 );


/* -------- Ana fonksiyon -------- */
