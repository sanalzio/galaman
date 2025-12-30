/* -------- İçe aktarımlar -------- */


import type { Move, Player, Board } from "../shared/modules/mancala";

import {
    getNextPit, createBoard, simulateMove
} from "../shared/modules/mancala";



// test.json dosyasını okuyup yorumları kaldırıp işliyoruz.
const testsFile = Bun.file(__dirname + "/test.json");
const testsRaw = await testsFile.text();
const tests = JSON.parse(
    // JSON.parse fonksiyonu dosya içeriğinde yorum satır-
    // larını kabul etmediği için bir regex ile siliyoruz.
    testsRaw.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        // bu fonksiyonun ne olduğunu ben de pek anlamadım
        // internette rastgele bir yerde buldum ama şimdilik
        // çalışıyor.
        (m, g) => g ? "" : m
    )
);


/* -------- İçe aktarımlar -------- */




/* -------- Ana işlevler -------- */


// Hangi testlerden kaç tanesinin geçtiğini
// ve kaldığının verisini saklayan obje.
const analitics = {};


// getNextHole fonksiyonu için testler
analitics["nextIndexTests"] = { // analizler için veriler girildi
    count: tests.nextIndexTests.length,
    passed: tests.nextIndexTests.length,
    failed: 0
};
for (let i = 0; i < tests.nextIndexTests.length; i++) {

    const testData = tests.nextIndexTests[i],
          output = getNextPit(testData.input, testData.player);

    if (output !== testData.expected) {
        // analizleri güncelliyor.
        analitics["nextIndexTests"]["failed"]++,
        analitics["nextIndexTests"]["passed"]--;
        console.log(`⚠  Bug bulundu: nextIndexTests[${i}] (P:${testData.player} I:${testData.input} E:${testData.expected} O:${output})`);
    }
}
console.log("\n✔  nextIndexTests testleri tamamlandı.");




// applyMoveToBoard fonksiyonu için testler
analitics["moveTests"] = {
    count: tests.moveTests.length*2,
    passed: tests.moveTests.length*2,
    failed: 0
};
for (let i = 0; i < tests.moveTests.length; i++) {

    const
        testData = tests.moveTests[i],
        // Eğer başlangıç tahtası girdisi varsa onu parçalara
        // ayırıp elementlerini sayı tipine dönüştürüyor.
        // Eğer başlangıç tahtası yoksa bir tane oluşturuyor.
        inputBoard = (
            testData.board
            ? testData.board.split(" ").map(e => parseInt(e))
            : createBoard()
        ),
        { board: outBoardObj, nextPlayer } = simulateMove(testData.player, testData.move, inputBoard),
        // Ekrana yazdırabilmek için okunabilir hale getiriyor.
        outBoard = outBoardObj.join(" ");
        //console.log(outBoardObj, "|", outBoard)

    // hamle sonrası tahtanın son hali uyuşmuyorsa
    if (outBoard !== testData.expected) {
        analitics["moveTests"]["failed"]++,
        analitics["moveTests"]["passed"]--;
        console.log(`⚠  Bug bulundu: moveTests[${i}] UnExpected Board: (OutBoard:"${outBoard}" NextPlayer:${nextPlayer})`);
    }
    // eğer hamle sonrası, sonraki oyuncu sırası
    // tespiti beklenen tespit ile uyuşmuyorsa
    if (testData.nextPlayer && nextPlayer !== testData.nextPlayer) {
        analitics["moveTests"]["failed"]++,
        analitics["moveTests"]["passed"]--;
        console.log(`⚠  Bug bulundu: moveTests[${i}] UnExpected NextPlayer: (NextPlayer:${nextPlayer} OutBoard:"${outBoard}")`);
    }
}
console.log("\n✔  moveTests testleri tamamlandı.");




console.log("\n" + "─".repeat(process.stdout.columns));
for (const key in analitics) {
    console.log(`Test ${key}: ✔  ${analitics[key]["passed"]} | ⚠  ${analitics[key]["failed"]} | * ${analitics[key]["count"]}`);
}


/* -------- Ana işlevler -------- */
