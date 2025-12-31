/* ------------------------- Açıklama ------------------------- *\

    Bu kod içerisinde kullandığım "pit" ve "store" kelimeleri
  şu anlamlara geliyor:

    pit: hazine dışınaki kuyular
    store: hazine kuyuları
    seed: taş, tohum
    gain: kazanç

  Neden kodda İngilizce bir yazım tercih ettim? Gerçekten sadece
  ilk başta İngilizce yazdığım için öyle devam ettim. Umarım
  rahatsız olmazsınız. Yorum satırlarını Türkçe yazdım.
  Genelde projelerim pek planlı olmaz ve başlangıçta, "Aceba
  çalışacak mı?" düşüncesiyle yazdığımdan dolayı yorum eklemem
  ve projeyi depo haline getirince de yorumsuz kaldığı için çok
  çirkin ve okumaz halde olur ama bu proje biraz daha planlı
  olduğundan birazcık daha okunabilir olmasını umuyorum.

    Bu arada yorumlarda ara sıra TypeScript'i de öğretir gibi
  yazdım çünkü bende bu proje ile adamakıllı TypeScript'i öğ-
  renmeye çalıştım typescript hakkında cahil muhamelesi his-
  settiyseniz lütfen kusruma bakmayın.

    Bu arada yorumlarda büyük harfle başlamadım. nedense istikrarla
  öyle yaptım ve öyle yapmaya devam edeceğim. Sanırım yorumlarda
  küçük harfle başlamak daha sıcak gözüktü, ne alakaysa artık bende
  anlamadım. Bayağı özür içeriği oldu bu açıklama ama kusruma bakmayın.

\* ------------------------- Açıklama ------------------------- */




/* -------- Tür tanımları -------- */


type Move = 1|2|3|4|5|6;
type Player = 1|0;

// hani normalde pits: number[] yapıp stores: {0: nubmer, 1: number}
// yaparsın ya, nedense hazineler ile kuyuları aynı array'ın içine koydum.
// belki kolaylık sağlamıştır, belki karmaşıklaştırmıştır bilemem ama
// benim için de enteresan oldu. belki refactor yaparsam değiştiririm de
// hayatımda hiçbir projem için refactoring yaptığımı hatırlamıyorum.
type Board = Uint8Array & { length: 14 };

// işte bu yüzden hazineler 7. ya da 14. kuyu oluyor.
type StoreIndex = 6|13;


// applyMove fonksiyonunun çıktı türü. belki ApplyMoveOut'dan anlaşılmaz diye.
type ApplyMoveOut = {

    nextPlayer: Player;
    gameOver: boolean|undefined;

    gain: number;
    // hamle sonrası hazineye atılan taş miktarı

    isCaptureMove: boolean;
    isDoublingMove: boolean;
};

type SimulateMoveOut = {
    board: Board;
    nextPlayer: Player;
    gameOver: boolean|undefined;
    gain: number;
    isCaptureMove: boolean;
    isDoublingMove: boolean;
};

// grafik arayüzde taş haraketlerinde animasyon
// kullanmak istediğim için taşları sonraki
// kuyuya taşırken gibi durumlarda belirtilen
// fonksiyonların çağrılıp o fonksiyonlar ile
// arayüzde hareketler yapmayı planlıyorum.
// bu yüzden bu tipleri belirttim.
type MancalaCatchPitEvent = { // kuyudaki taşları alma (hamle başlangıcı)
    pitIndex: number;
    seedCount: number;
};
type MancalaSeedMoveEvent = { // kuyudaki taşların hareketi
    pitIndex: number;
    seedCount: number;
    movedAllInPit?: number;
};
type MancalaWinnerEvent = {
    player: Player;
};
type MancalaPlayerChangeEvent = {
    oldPlayer: Player;
    newPlayer: Player;
};
// belki kullanırım diye geçmişte seyehat eylemi
type MancalaGoHistoryEvent = {
    originalBoard: Board;
    originalPlayer: Player;
};

type mancalaEvent = MancalaCatchPitEvent|MancalaSeedMoveEvent|MancalaWinnerEvent|MancalaPlayerChangeEvent|MancalaGoHistoryEvent|boolean;

type mancalaEventListener = (event: mancalaEvent) => void|true;

type mancalaEventListeners = {
    // hamle yapılacak hazneyi ele alma işlemi
    CatchPit?: mancalaEventListener[];
    // ele alınan taşın kutuya atılma işlemi
    SeedMove?: mancalaEventListener[];
    // eğer kazanan varsa
    Winner?: mancalaEventListener[];
    // eğer berabere ise
    Draw?: mancalaEventListener[];
    // eğer oyun sırası değiştiyse
    PlayerChange?: mancalaEventListener[];
    // eğer geçmiş bir tahtaya dönülüyorsa
    GoHistory?: mancalaEventListener[];
};

type mancalaEventName = "CatchPit"|"SeedMove"|"Winner"|"Draw"|"PlayerChange"|"GoHistory";

type mancalaEventHandler = (eventName: mancalaEventName, event: mancalaEvent) => void;


type mancalaHistoryEntry = { player: Player, move: Move };


// Yeni bir tür hata oluşturuyoruz.
/* Kullanımı:
try {
    throw new BadMoveError("Belirtilen kuyu boş.");
} catch (err) {
    if (err instanceof BadMoveError) {
        console.log("Kuyu boşmuş.");
    } else console.log("Başka bir hata.");
}
*/
class BadMoveError extends Error {
    constructor(message: any) {
        super(message);
        this.name = 'BadMoveError';
    }
}


// ".pmgn dosyası bozuk" hatası
class BadGameFileError extends Error {
    constructor(message: any) {
        super(message);
        this.name = 'BadMoveError';
    }
}


/* Kullanımı:
try {
    throw new BadBoardError();
} catch (err) {
    if (err instanceof BadBoardError) {
        console.log("Tahta hatalıymış.");
    } else console.log("Başka bir hata.");
}
*/
class BadBoardError extends Error {
    constructor(message: any = undefined) {
        super(message);
        this.message = "Hatalı tahta tanımı: doğrusu number[14] olmalı.";
        this.name = 'BadBoardError';
    }
}


/* -------- Tür tanımları -------- */




/* -------- Değişkenler -------- */


// ne bu salakça gözüken obje? utanmadan kendi oluşturduğum dediğim
// .pmgn dosya sistemi ile mangala oynunun dosya hallinde dışarı akta-
// rılmasını sağlarken aynı biçimde içe aktarırken her sayıyı teker
// teker Number() işleminden geçirmek yerine objeden integer karşılığını
// alırım dedim. neyse PMGN.parse fonksiyonunda açıklamaya çalışırım.
const stringMoves: Record<string, Move> = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6
};


// Projece yapay zeka işlemleri kullanacağım için typedArray kullanmayı seçtim.
// Int8Array [-128, 127] değer aralığı arasında sayılar tutabildiği ve
// bellekte az yer kapladığı için seçildi.
const MANCALA_BOARD_TEMPLATE = new Int8Array([
    4, 4, 4,  4, 4, 4, 0, // 1. oyuncu
    4, 4, 4,  4, 4, 4, 0 // 2. oyuncu
]);


/* -------- Değişkenler -------- */




/* -------- Fonksiyonlar -------- */


// opposite değil other. neden mi? Allah bilir.
const getOtherPlayer = (player: Player): Player => 1 - player as Player;



// eğer sonraki kuyu rakibin hazinesine denk geliyorsa
// oyuncunun kendi kuyuna geçmesi için güvenli bir şekilde
// bir sonraki kuyunun indeksini alır.
function getNextPit(index: number, player: Player): number {

    // eğer verilen indeks 13 yani listenin sonuysa sonraki
    // indeks olarak 0'ı döndürüyor.
    if (index == 13) index = 0;

    else index++;

    return (
        // eğer sonraki indeks, rakip oyuncunun
        // hazinesine denk geliyorsa
        isStore(index, getOtherPlayer(player))
         ? player*7
         : index
    );
    // buradaki player*7 ifadesi alttaki yorum bloğunda açıklandı.
}



// oyuncu id'sine göre (0 veya 1) oyuncunun hazinesinin indeksini buluyor.
const getPlayerStoreIndex = (player: Player): StoreIndex => player*7 + 6 as StoreIndex;

/*  Tahtanın biçiminde iki oyuncunun tahtası birleşik
    olduğu için eğer ilk oyuncuysa yani player = 0 ise
    player*7 yani 0*7 = 0 ve hamle olarak 1. kuyu dediğimizde
    indeks olarak 0'ı almamız gerktiği için move -1 alıyoruz.
    Yani son durumda (player*7) + (move - 1) oluyor.

    örnek: player = 0 yani 1. oyuncu ve move = 1 yani ilk kuyu
    sonuç: 0*7 + 1 - 1 = indeks 0

    örnek2: player = 1 yani 2. oyuncu ve move = 1 yani ilk kuyu
    sonuç: 1*7 + 1 - 1 = indeks 7

    tahtamız şöyle birşey:

    0. indeks
[   ↓
    4, 4, 4,  4, 4, 4,  0, // oyuncu 1
    4, 4, 4,  4, 4, 4,  0, // oyuncu 2
]   ↑
    7. indeks
    (2. oyuncunun 1. kuyusu)
*/


const isStore = (index: number, player?: Player): boolean => (

    player == undefined
        ? index == 6 || index == 13
        // oyuncu belirtildiyse özel olarak o oyuncunun indeksi olup
        : index == getPlayerStoreIndex(player)// olmadığını kontrol ediyor.
);


// kuyu indeksinden hangi oyuncunun kuyusu olduğunu buluyor.
const getPitOwnerFromIndex = (index: number): Player => index > 6 ? 1 : 0;


// verilen kuyu indeksinin karşısındaki kuyunun indeksini alıyor.
const getOppositePit = (index: number): number => 13 - (index + 1);



// verilen tahtadaki verilen oyuncunun hazine dışındaki kuyularını döndürüyor.
/* Örnek:
    const board = [
        4, 4, 4,  4, 4, 4,  0, // oyuncu 1 (player = 0)
        5, 5, 5,  5, 5, 5,  0, // oyuncu 2 (player = 1)
    ];
                          (1. oyuncu)
                               ↓
    > sliceOfPlayerPits(board, 0);
    < [4, 4, 4, 4, 4, 4]
*/
const sliceOfPlayerPits = (board: Board, player: Player): Uint8Array => (
    board.slice(
        player*7, // başlangıç
        player*7 + 6 // son
    )
);


const sliceOfPlayerPitsIndexs = (board: Board, player: Player): number[] => [
    player*7,
    player*7 + 6
];


// verilen tahtadaki verilen oyuncunun hazine dışındaki tüm kuyularındaki
// taşların sayısını döndürüyor.
const seedCountInPlayerPits = (board: Board, player: Player): number => (

    sliceOfPlayerPits(board, player)
        .reduce((pre, curr) => pre + curr, 0)
);


// hamle kuyusu indeksinden (1-6) oyuncuya özel kuyu indekini buluyor.
const getMovePitIndex = (player: Player, move: Move): number => player*7 + move -1;


const playerStoreIndex = (player: Player): StoreIndex => player ? 13 : 6;


// verilen oyuncunun hazine dışındaki kuyularının
// boş olup olmadığını kontrol eder.
const checkPlayerPitsIsEmpty = (board: Board, player: Player): boolean => {

    for (const seedCount of sliceOfPlayerPits(board, player)) {
        if (seedCount) return false;
    }
    return true;
};


const evaluateStoresDiff = (board: Board, player: Player): number => (
    board[playerStoreIndex(player)]
    -
    board[playerStoreIndex(getOtherPlayer(player))]
);


const getWinner = (board: Board): Player|null => (
    // berabere durumunda null
    board[playerStoreIndex(0)] == board[playerStoreIndex(1)] ? null :

    // 1. oyuncunun hazinesinden 2. oyuncun hazinesini çıkarıp
    // eğer fark pozitif bir sayıysa yani 1. oyuncunun hazinesi
    // 2. oyuncun hazinesinden fazlaysa,
    (
        board[playerStoreIndex(0)] - board[playerStoreIndex(1)] > 0
        ? 0 // 1. oyuncu indekini döndür.
        : 1 // değilse 2. oyuncu indekini döndür.
    )
);


const getAvailableMoves = (board: Board, player: Player): Move[] => (
    [6, 5, 4, 3, 2, 1].filter((move: Move) => board[getMovePitIndex(player, move)])
) as Move[]




function isPlayerPitsEmpty(board: Board, player: Player): boolean {

    let [ sliceStart, sliceEnd ] = sliceOfPlayerPitsIndexs(board, player);

    while (sliceStart < sliceEnd) {

        if (board[sliceStart]) return false;
        sliceStart++;

    }

    return true;
}

// oyun tahtasının bitip bitmediğini ölçüyor. bu fonksiyonda aklıma gelen ilk ve en iyi
// optimizasyon fikri, dolu olması en muhtemel olan kuyuları kontrol edip herhangi bir
// dolu kuyu bulunduğunda false döndürmek oldu. bunun için lastPlayer değeri gerekli
// olmayıp son hamleyi yapan oyuncuyu temsil ediyor çünkü son hamleyi yapan oyuncunun
// kuyularının boş olma olasılığı daha yüksek. son hamleyi yapmayan oyuncunun kuyuları
// arasından, hazineye en uzak kuyuyu kontrol ediyor çünkü en uzak kuyunun dolu olma
// ihtimali en yüksek. kısacası son hamleyi yapmayan oyuncunun hazineye en uzak kuyusunun
// dolu olma ihtimali en yüksek olduğu için ondan başlayarak dolu kuyu bulana kadar tüm
// kuyuları kontrol ediyor.
const isTerminal = (board: Board, lastPlayer: Player = 0): boolean => (
    isPlayerPitsEmpty(board, getOtherPlayer(lastPlayer)) // eğer rakibin taşları boşsa
    &&
    isPlayerPitsEmpty(board, lastPlayer)
)





function applyMove(player: Player, move: Move, board: Board, eventHandler?: mancalaEventHandler): ApplyMoveOut {

    let moveIndex: number = getMovePitIndex(player, move), // hamle yapılan kuyu
        moveCount: number; // kuyunun içerdiği taş sayısı

    // hamle kuyusu boşsa
    if (move > 6 || move < 1 || !board[moveIndex]) {
        throw new BadMoveError("Belirtilen kuyu boş.");
    }


    // eğer bir etkinlik tetikleyicisi atandıysa,
    // hazneyi ele alma etkinliği için tetikle.
    if (eventHandler) eventHandler("CatchPit", {
            pitIndex: moveIndex,
            seedCount: board[moveIndex]
        }
    );


    // eğer sadece bir taş varsa direkt taşı diğer kuyuya geçir
    if (board[moveIndex] == 1) {
        moveCount = 1;
        board[moveIndex] = 0;
    } else { // değilse kuyuya bir taş bırakıp sonraki kuyuya geç.
        moveCount = board[moveIndex] -1;
        board[moveIndex] = 1;
        applyMoveSeedMoveHandler(eventHandler, moveIndex);
    }


    const oppositePlayer = getOtherPlayer(player),
          playerStoreIndex: StoreIndex = getPlayerStoreIndex(player),
          playerStoreValue = board[playerStoreIndex];

    // hamlenin, çalma hamlesi olup olmadığını tutuyor.
    // yani son taşı ile kendi boş kuyularından birini
    // doldurup karşı kuyudakileri alma hamlesi.
    let isCaptureMove:boolean = false;
    // bu da rakibin kuyusunu çiftleyip içini alma hamlesi.
    let isDoublingMove:boolean = false;


    while (moveCount > 0) {

        moveIndex = getNextPit(moveIndex, player);

        moveCount--;

        if (
            !moveCount // elimizdeki son taşı bu kuyuya harcadıysak,
        ) {
            const pitOwner: Player = getPitOwnerFromIndex(moveIndex);

            if ( // ↑ elimizdeki son taşı bu kuyuya harcadıysak, (yukarıdan geliyor)
                pitOwner != player // eğer kuyu rakibin kuyusuysa,
                &&
                board[moveIndex] % 2 == 1 // eğer bu taş ile kuyu çiftlendiyse,
            ) {
                // taşların hepsini kendi hazinemize atıyoruz.

                isDoublingMove = true;

                applyMoveSeedMoveHandler(eventHandler, moveIndex);
                board[playerStoreIndex] += board[moveIndex] + 1;

                applyMoveSeedMoveHandler(eventHandler, playerStoreIndex, null, moveIndex);
                board[moveIndex] = 0;

                return applyMoveExit(board, player, oppositePlayer, oppositePlayer, playerStoreIndex, playerStoreValue, isCaptureMove, isDoublingMove, eventHandler);
            }


            if (// ↑ elimizdeki son taşı bu kuyuya harcadıysak, (yukarıdan geliyor)
                pitOwner == player // eğer kuyu, hamleyi yapanın kuyusuysa;
                &&
                !isStore(moveIndex) // eğer hazine kuyusu değilse,
                &&
                !board[moveIndex] // eğer kuyu boşsa
            ) {
                const oppositePitIndex = getOppositePit(moveIndex);
                if (
                    // eğer kuyunun karşısındaki rakip kuyusu doluysa,
                    board[oppositePitIndex]
                ) {
                    isCaptureMove = true;

                    applyMoveSeedMoveHandler(eventHandler, moveIndex);
                    board[playerStoreIndex] += board[oppositePitIndex] + 1;

                    applyMoveSeedMoveHandler(eventHandler, playerStoreIndex, null, moveIndex);
                    applyMoveSeedMoveHandler(eventHandler, playerStoreIndex, null, oppositePitIndex);
                    board[oppositePitIndex] = 0;

                    return applyMoveExit(board, player, oppositePlayer, oppositePlayer, playerStoreIndex, playerStoreValue, isCaptureMove, isDoublingMove, eventHandler);
                }
            }
        }

        applyMoveSeedMoveHandler(eventHandler, moveIndex);

        board[moveIndex] += 1;
    }

    return (
        isStore(moveIndex, player)
        ? applyMoveExit(board, player, player, oppositePlayer, playerStoreIndex as StoreIndex, playerStoreValue, isCaptureMove, isDoublingMove, eventHandler)
        : applyMoveExit(board, player, oppositePlayer, oppositePlayer, playerStoreIndex as StoreIndex, playerStoreValue, isCaptureMove, isDoublingMove, eventHandler));
}

// aşağıdaki iki fonksiyon applyMove fonksiyonunun birer parçalarıdır. bu fonksiyonlar
// birden fazla kez tekrar ettiği için fonksiyon haline getirilmişlerdir.

// fonksiyonun çıkışta bazı kontroller ile gerekli
// çıktı verisini döndürmesini sağlayan bir fonksiyon.
const applyMoveExit = (board: Board,
    player: Player,
    nextPlayer: Player,
    oppositePlayer: Player,
    playerStoreIndex: StoreIndex,
    playerStoreValue: number,
    isCaptureMove: boolean,
    isDoublingMove: boolean,
    eventHandler: mancalaEventHandler,
): ApplyMoveOut => {

    let gameOver: boolean;

    if (checkPlayerPitsIsEmpty(board, player)) {

        gameOver = true;

        for (let i = oppositePlayer*7; i < oppositePlayer*7 + 6; i++) {
            if (!board[i]) continue

            board[playerStoreIndex] += board[i];

            applyMoveSeedMoveHandler(eventHandler, playerStoreIndex, null, i);
            board[i] = 0;
        }
    } else if (checkPlayerPitsIsEmpty(board, oppositePlayer)) {

        gameOver = true;

        for (let i = player*7; i < player*7 + 6; i++) {
            if (!board[i]) continue

            const oppositePlayerStoreIndex = getPlayerStoreIndex(oppositePlayer);

            board[oppositePlayerStoreIndex] += board[i];
            applyMoveSeedMoveHandler(eventHandler, oppositePlayerStoreIndex, null, i);
            board[i] = 0;
        }
    }

    return {

        nextPlayer,
        gameOver,

        // hamle sonrası hazineye atılan taş miktarı
        gain: (board[playerStoreIndex] - playerStoreValue),

        isCaptureMove,
        isDoublingMove
    };
};

// tetiklenecek fonksiyon belirtildiyse o fonksyionnu tetikliyor.
function applyMoveSeedMoveHandler(
    eventHandler: mancalaEventHandler,
    moveIndex: number,
    seedCount: number = 1,
    movedAllInPit?: number
): void {
    if (eventHandler) eventHandler("SeedMove", {
            pitIndex: moveIndex,
            seedCount: seedCount,
            movedAllInPit: movedAllInPit
        }
    );
}




// parametre olarak verilen tahtada direkt oynama yapmamak için
// yeni tahta oluşturulup onun üzerinde değişiklik yapıyor.
function simulateMove(player: Player, move: Move, board: Board): SimulateMoveOut {
    const // <- nedense bu proje boyunca bu tarz virgüllü atamaları çok kullandım.

        // aynı tahta verisini verdiğimizde sadece adresi
        // vermişiz gibi davranarak orjinal tahta verisi
        // üzerinde oynama yaptığı için orjinal tahtayı
        // kopyalayıp kullanıyoruz. Kayıp olarak bellekte
        // bir tahta verisi boyutunda yer kaplıyor.
        virtualBoard: Board = new Uint8Array(board) as Board,
            // const bu arada bu ikisi. (keyword yukarıda)
        { nextPlayer, gameOver, gain, isCaptureMove, isDoublingMove } = applyMove(player, move, virtualBoard);

    return { board: virtualBoard, nextPlayer, gameOver, gain, isCaptureMove, isDoublingMove };
    // birden fazla veriyi birden döndürdüğü için kullanımı

    // const {
    //     board: newBoard, nextPlayer, gameOver,
    //     gain, isCaptureMove, isDoublingMove
    // } = simulateMove(...);

    // şeklinde oluyor.
}



function createBoard(): Board {
    return new Uint8Array(MANCALA_BOARD_TEMPLATE) as Board
}



function getPlayerString(player: Player): string {
    return `player ${player + 1}`
}



// verilen tahtadaki verilen oyuncu için olası
// hamlelerin hepsi üzerinde işlem döndürmenize
// yarıyor.
function forEachMoves(
    board: Board, player: Player,
    callFunc: (move: Move) => any,
    reverse: boolean = false // 6. hamleden başlayarak işlemek için
): void {
    for (
        let move: Move = reverse ? 6 : 1;
        reverse ? move >= 1 : move <= 6;
        reverse ? move-- : move++
    ) {

        // eğer kuyu boşsa atla
        if (!board[getMovePitIndex(player, move as Move)]) continue;

        callFunc(move as Move);
    }
}



// 0 yada 1 değerli rastgele bir bit döndürür.
const randomBit = (): (1|0) => Math.random() < 0.5 ? 0 : 1;



// PGN: Portable Game Notation -> Portable Mancala Game Notation
// Bu PGN ne? Satranç oynlarında oynu dosya halinde kayıt etmek
// için bir sistem. Bende kendimce onu uyarladım.
const PMGN = {

    parse(pmgnData: string): { historyObj: mancalaHistoryEntry[], metadata: Record<string, string> } {

        pmgnData = pmgnData.trim();

        if (!pmgnData)
            throw new BadGameFileError(".pmgn dosyası boş.");

        try {

            pmgnData = pmgnData.replaceAll("\r", ""); // windows'un \r\n zımbırtısı için.

            const lines = pmgnData.split("\n"),
                  gameDataLines: string[] = [],
                  metadata: Partial<Record<string, string>> = {};

            while (lines.length) {

                const line = lines.shift().trim();

                if (!line) continue;

                // başında # varsa yorum satırdır, sonraki satır.
                if (line.startsWith("#")) continue;

                // metadata'lar yani üstveriler için dosyanın başında veya
                // herhangi bir satırında ["veri anahtarı", "veri"]
                // şeklinde veri tanımlamayı mümkün kılması için,
                // satır boşluklarda sonra [ ile başlıyorsa o satırı
                // üsteveri satırı olarak sayıp json listesi olarak
                // tanımlamaya çalışıp üstveri olarak kayıt ediyor.
                // eğer satır hatalı yazılmışsa direkt dosya bozuk
                // hatası veriyor. ["anahtar", "veri"] // açıklama
                // gibi bir kullanım da hatalı sayılıyor.
                if (line.startsWith("[")) {
                    const metadataObj = JSON.parse(line);
                    metadata[metadataObj[0]] = metadataObj[1];
                
                // eğer [ ile başlamıyorsa demek ki oyun verisi satırı.
                } else gameDataLines.push(line);
            }

            const historyObj: mancalaHistoryEntry[] = [];
            let parsingMovePlayer: Player,
                inBracket: number = 0;
            // satır içindeki parantezin içerisine yazılanları yorum
            // olarak saymak için parantez içerisinde olup olmadığını
            // tutan bir değişken kullanımı şu şekilde:
            // yorum değil (yorum (yorum içi yorum)) yorum değil

            while (gameDataLines.length) {

                const line = gameDataLines.shift();

                // iyi de tek karakter olarak değerlendirirsen
                // iki basamaklı sayılar ne olacak? evet 2 basamaklı
                // sayı olamaz çünkü veri sadece hamleyi yapan oyuncu
                // ve hamle kuyusunun indeksi 1-6 olarak geçiyor.
                for (const char of line) {

                    const isNumber = char >= '0' && char <= '6';
                    const isBracketOpen = char == '(';
                    const isBracketClose = char <= ')';


                    if (inBracket) {
                        if (isBracketOpen) inBracket++;
                        if (isBracketClose) inBracket--;
                        continue;
                    }


                    // eğer geçerli bir sayı ve satır içi yorum
                    // değilse boş karakterdir, diğer karaktere geç.
                    if (!isNumber || inBracket) continue;


                    if (parsingMovePlayer == undefined) {

                        if (char == '1') parsingMovePlayer = 0;
                        else if (char == '2') parsingMovePlayer = 1;
                        else throw null; // herhangi bir hata olabilir
                        // çünkü en altta zaten herhangi bir hata yakalarsa
                        // "bozuk" dedirten bir kod var.

                        continue;
                    }

                    if (stringMoves[char]) {

                        historyObj.push({ player: parsingMovePlayer, move: stringMoves[char] });
                        parsingMovePlayer = undefined;
                        continue;

                    } else throw null;
                }
            }

            return { historyObj, metadata };

        } catch {
            throw new BadGameFileError(".pmgn dosyası bozuk.");
        }
    },

    // parse ile generate biraz karışabilir parse pmgn verisini objeye
    // çevirirken, generate obje verisinden pmgn verisi oluşturuyor.
    generate(historyObj: mancalaHistoryEntry[], metadata?: Record<string, string>) {

        // string + string + string yapmadım çünkü stringler immutable
        // yani değiştirilemez olduğu için her string + string işleminde
        // yeni string verisi oluşturuluyor. V8 motoru bunu güzel optimize
        // etse bile yine de veri fazla olunca bir sınıra dayanabiliyor.
        // bu yüzden array halden en sonda string'e çeviriyoruz.
        const outData: string[] = [],
              metadataEntries = metadata != undefined ? Object.entries(metadata): [];

        for (const metadataObj of metadataEntries) {
            outData.push(JSON.stringify(metadataObj));
        }

        // sadece dosya güzel gözüksün diye eğer üstveri varsa
        // üstveri ile oyun verisi arasına fazladan bir satır ekliyor.
        if (metadataEntries.length) outData.push("");

        outData.push(
            historyObj.map(
                historyEntry => [ historyEntry.player + 1, historyEntry.move ].join(": ")
            ).join(", ")
        );

        return outData.join("\n");
    }
}



// Fonskiyonlara dahil ettim ama ana API bu.
class Mancala {

    // 0 -> 1. oyuncu | 1 -> 2. oyuncu.
    player: Player = 0;

    metadata: Record<string, string>

    board: Board = createBoard();

    // geçmişte gezinebilme fonksiyonlarında
    // hızlıca geri dönüş yapabilmek için.
    originalBoard: Board;
    originalPlayer: Player;

    // ilk oynayan oyuncunun indeksi 0 olmak zorunda değil 1 de olabilir.
    // yani 2. oyuncu olarak belirttiğim 1 indeksi de ilk oyuncu olabilir.
    firstPlayer: Player;

    eventListenersList: mancalaEventListeners = {};

    // hamlelerin geçmişini tutuyor. evet sadece hamlelerin
    // çünkü eğer her hamle sonrası olan board'ı da
    // tutarsam fazla bellek alabilir dedim.
    moveHistory: mancalaHistoryEntry[] = [];
    historyIndex: number;

    // isTerminal ne? cli'da oynanıp oynanmadığını mı tutuyor?
    // yok öyle değil buradaki terminal ifadesi oyunun sonlanıp
    // sonlanmadığını belirtiyor. yani "son hali" gibi bir anlama geliyor.
    isTerminal: boolean = false;
    winner: Player|null;


    constructor(options: { player?: Player, board?: Board } = {}) {

        if (options.board) {
            // yavalar ve oyuncu hazinesi yuvaları olarak toplam 14 kuyu olmalı.
            if (options.board.length != 14) {
                throw new BadBoardError();
            }
            this.board = options.board;
        }

        if (options.player != undefined) this.player = options.player;
    }


    setMetadata(key: string, value: string) {
        if (!this.metadata) this.metadata = {};
        this.metadata[key] = value;
    }

    clearMetadata() {
        this.metadata = undefined;
    }


    newGame(
        options: {
            player?: Player,
            board?: Board,
            clearMetadata?: boolean
        } = {
            clearMetadata: true
        }
    ) {
        if (options.board) {
            if (options.board.length != 14) {
                throw new BadBoardError();
            }
            this.board = options.board;
        }
        else {
            this.board = createBoard();
        }

        if (options.player != undefined) this.player = options.player;
        else this.player = 0;

        // geçmiş gibi şeyleri temizliyoruz.
        this.originalBoard = undefined,
        this.originalPlayer = undefined,
        this.historyIndex = 0;

        if (options.clearMetadata) this.clearMetadata();
    }


    setPlayer(player?: Player): void {
        if (player == undefined) {
            this.randomPlayer();
            return;
        }
        if (this.player != player) {
            const oldPlayer = this.player;
            this.player = player;
            this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: this.player });
        }
    }

    setPlayerName(player: Player, name: string): void {

        const playerMetadataKey = getPlayerString(player);

        this.setMetadata(playerMetadataKey, name);
    }

    getPlayerName(player: Player, name: string): string {

        const playerMetadataKey = getPlayerString(player);

        return this.metadata[playerMetadataKey];
    }

    // rastgele bir bit alarak oyuncuyu seçer
    randomPlayer(): void {
        // 0 yada 1 ama rastgele.
        const oldPlayer = this.player;
        this.player = randomBit();
        this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: this.player });
    }

    // sonraki oyuncuya geçirir.
    switchPlayer(): void {
        const oldPlayer = this.player;
        this.player = getOtherPlayer(this.player);
        this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: this.player });
    }

    setBoard(board: Board): void {
        if (board.length != 14) {
            throw new BadBoardError();
        }
        this.board = board;
    }


    // geçmişin belirtilen anındaki tahta pozisyonunu oluşturuyor.
    boardFromHistory(historyIndex: number): void {

        // eğer daha oynama geçmişi yoksa veya istenilen hamle indeksi
        // geçmişte yoksa yani gelecekteki bir hamle isteniyorsa
        // hiçbirşey yapmadan bırakıyor.
        if (!this.moveHistory.length || this.moveHistory.length < historyIndex) return;

        // eğer orginalBoard değeri yoksa şu an ilk kez
        // bir geçmiş tahtasında geziniyor demek oluyor.
        if (!this.originalBoard) {
            // orjinal tahtayı unutmamak için kaydediyoruz.
            this.originalBoard = this.board,
            // oyun sırası da aynı şekilde
            this.originalPlayer = this.player;
        }

        const oldPlayer = this.player;

        // eğer historyIndex olarak 0 verildiyse demek ki başlangıç
        // pozisyonuna dönmek istiyor yani temiz bir tahta oluşturuyor.
        if (!historyIndex) {
            this.board = createBoard(),
            this.player = this.firstPlayer,
            this.historyIndex = 0;
        }

        // eğer son hamleye gitmek yani orijinal tahtaya dönmek istiyorsa
        else if (this.moveHistory.length == historyIndex && this.originalBoard)
            return this.backToNowBoard();

        // eğer normal bir geçmiş pozisyonu indeksi verdiyse
        else {

            this.historyIndex = historyIndex,
            this.board = createBoard();

            // temiz bir board tanımlayıp belirtilen indeks'e kadarki yerleri board'a uyguluyor.
            // yani history olarak board'ı da saklamayım dedim. daha fazla bellek kaplamasın diye.
            for (let i = 0; i < historyIndex; i++) {
                const { nextPlayer } = (
                    applyMove(this.moveHistory[i].player, this.moveHistory[i].move, this.board));
                this.player = nextPlayer;
            }
        }

        this.handleEvent("GoHistory", {
            originalBoard: this.originalBoard,
            originalPlayer: this.originalPlayer
        });

        if (oldPlayer != this.player)
            this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: this.player });
    }

    // ana tahta pozisyonuna geri döner.
    backToNowBoard(): void {

        const oldPlayer = this.player;

        this.board = this.originalBoard,
        this.player = this.originalPlayer,
        this.originalBoard = undefined,
        this.originalPlayer = undefined,
        this.historyIndex = undefined;

        if (oldPlayer != this.player)
            this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: this.player });
    }

    // geçmiş özelliğini kullanarak hamleyi geri alır.
    undoFromHistoy(): void {

        if (this.historyIndex == undefined)
            this.historyIndex = this.moveHistory.length;

        this.boardFromHistory(--this.historyIndex);
    }

    redoFromHistoy(): void {

        if (this.historyIndex == undefined) return;

        this.boardFromHistory(++this.historyIndex);
    }


    importPMGN(pmgnData: string) {

        const parsedPMGN = PMGN.parse(pmgnData);

        this.metadata = { ...this.metadata, ...parsedPMGN.metadata },
        this.moveHistory = parsedPMGN.historyObj;

        this.board = createBoard();
        for (let i = 0; i < this.moveHistory.length; i++) {
            const { nextPlayer } = (
                applyMove(this.moveHistory[i].player, this.moveHistory[i].move, this.board));
            this.player = nextPlayer;
        }

        this.isTerminal = isTerminal(this.board, this.moveHistory[this.moveHistory.length-1].player);
        if (this.isTerminal) {
            this.winner = getWinner(this.board);

            if (this.winner != undefined) {
                this.setMetadata("winner", getPlayerString(this.winner));
            } else {
                this.setMetadata("draw", "true");
            }
        }

        this.originalBoard = undefined,
        this.originalPlayer = undefined,
        this.historyIndex = undefined;
    }

    exportPMGN(): string {
        const metadata = (
            this.isTerminal
            ? this.metadata
            : { ...this.metadata, "play turn": this.player.toString() }
        );
        return PMGN.generate(this.moveHistory, metadata);
    }


    /* Kullanım örneği:
        mancalaClass.addEventListener(
            "Draw",
            (isDraw) => console.log(isDraw)
        );
    */
    addEventListener(eventName: mancalaEventName, callFunc: mancalaEventListener): void {

        if (!this.eventListenersList[eventName])
            this.eventListenersList[eventName] = new Array();

        // dinleyicilerde, son giren ilk çıkar mantığıyla çalışması için,
        // dinleyici listesinin sonuna değil de başına ekliyor.
        this.eventListenersList[eventName].unshift(callFunc);
    }

    // eğer ilgili etkinlik dinleyici atandıysa etkinlik dinleyiciyi tetikler.
    handleEvent(eventName: mancalaEventName, event: mancalaEvent): void {

        // eğer ilgili etkinlik için dinleyici(ler) atandıysa
        if (this.eventListenersList[eventName]) {
            // dinleyici listesini al (kodu tekrar edip, çorba yapmamak için)
            const listeners: mancalaEventListener[] = this.eventListenersList[eventName];

            // baştan sona her dinleyici için dögüye gir.
            // buradaki baştan sona olması, son giren ilk
            // çıkar mantığı için önemli.
            for (const listenerIndex in listeners) {

                /* peki neden son giren ilk çıkar?
                   çünkü eğer bir dinleyici, diğer
                   dinleyicilerin tetiklenmesini istemezse
                   yani web'de kullandığımız event.preventDefault()
                   gibi bir işlev için, son atanan yani ilk çalışan
                   dinleyici, "tamam diğerlerini durdur." derse
                   diğerleri durdurulabilsin diye. */

                // dinleyici fonksiyonunu çalıştırıyor. ama
                // event.prevent() eklemek yerine return true;
                // kodu ile durdurması için sonucun true olup
                // olmadığını kotrol ediyor.
                if (listeners[listenerIndex](event)) {

                    // eğer sonuç true ise sonraki dinleyicileri sustur.

                    // ama burada bir uyarı ekledim. bu uyarı; eğer
                    // çalışan ve susturma talep eden dinleyici ilk
                    // çalışan dinleyici değilse uyarı veriyor.
                    if (listenerIndex)
                        console.warn(
                            "Sonraki dinleyiciler susturuldu, ama bu dinleyici çalışan ilk dinleyici değildi."
                        );

                    break;
                }
            }
        }
    }


    makeMove(move: Move): void {

        const { nextPlayer, gameOver } = applyMove(this.player, move, this.board, this.handleEvent.bind(this));

        // eğer şu anda geçmiş tahtalar üzerinde gezilmesine 
        // rağmen bir hamle yapıldıysa orijinal tahta verisini
        // silip şu anki tahtayı orijinal tahta yapıyoruz.
        if (this.originalBoard) {
            this.originalBoard = undefined,
            this.originalPlayer = undefined,
            this.moveHistory = this.moveHistory.slice(this.historyIndex);
        }

        // eğer ilk hamleyse, hamleyi yapan oyuncuyu
        // başlangıç oyuncusu olarak belirle
        if (!this.firstPlayer)
            this.firstPlayer = this.player;

        this.moveHistory.push(
            {
                player: this.player,
                move
            }
        );

        if (gameOver) {
            this.isTerminal = true;
            this.winner = getWinner(this.board);

            if (this.winner != undefined) {
                this.handleEvent("Winner", { player: this.winner });
                this.setMetadata("winner", getPlayerString(this.winner));
            } else {
                this.handleEvent("Draw", true);
                this.setMetadata("draw", "true");
            }

            return;
        }

        // eğer hamle sonrası oyun sırası değiş-
        // tiyse etkinlik dinleyiciyi tetikle
        if (nextPlayer != this.player) {
            const oldPlayer = this.player, newPlayer = nextPlayer;
            this.player = nextPlayer; // burada sadece oyuncu sırası verisini değiştiriyor.
            this.handleEvent("PlayerChange", { oldPlayer: oldPlayer, newPlayer: newPlayer });
        }
    }
}


/* -------- Fonksiyonlar -------- */




/* -------- Dışa aktarmalar -------- */


export type {
    Move, Player, Board, StoreIndex,
    mancalaEventListeners, mancalaEventListener,
    mancalaEventName, 
    MancalaCatchPitEvent, MancalaSeedMoveEvent, MancalaWinnerEvent, MancalaPlayerChangeEvent, MancalaGoHistoryEvent
};

export {

    // Özel hata tiplerini TypeScript'e tip olarak
    // yediremediğimiz için buraya ekliyoruz.
    BadBoardError, BadMoveError,

    Mancala,

    getOtherPlayer, getNextPit, isStore, getPlayerStoreIndex, getMovePitIndex,
    createBoard, getPlayerString, forEachMoves, applyMove, randomBit, simulateMove,
    sliceOfPlayerPits, sliceOfPlayerPitsIndexs, getPitOwnerFromIndex, getOppositePit,
    seedCountInPlayerPits, playerStoreIndex, checkPlayerPitsIsEmpty, evaluateStoresDiff,
    getWinner, getAvailableMoves, isPlayerPitsEmpty, isTerminal,

    PMGN

};


/* -------- Dışa aktarmalar -------- */
