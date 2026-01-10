/* -------------------------- Açıklama -------------------------- *\

    Bu modül basitçe oyun bilgilerini dosya içeriği haline getirip,
  dosya içeriği halindeki oyun bilgilerini okumaya yarıyor.

    PGN: Portable Game Notation -> Portable Mancala Game Notation
  PGN sistemi, satranç oynlarında oyunu dosya halinde kayıt etmek
  için geliştirilmiş bir sistem. Bende onu kendimce PMGN sistemi
  olarak mangala oyununa uyarladım.

\* -------------------------- Açıklama -------------------------- */




/* -------- İçe aktarımlar -------- */


import type { Move, Player, mancalaHistoryEntry } from "./mancala";


/* -------- İçe aktarımlar -------- */




/* -------- Tür tanımları -------- */


// ".pmgn dosyası bozuk" hatası
class BadGameFileError extends Error {
    constructor(message: any) {
        super(message);
        this.name = 'BadMoveError';
    }
}


/* -------- Tür tanımları -------- */




/* -------- Sabitler -------- */


// ne bu salakça gözüken obje? utanmadan kendi oluşturduğum dediğim
// .pmgn dosya sistemi ile mangala oynunun dosya hallinde dışarı akta-
// rılmasını sağlarken aynı biçimde içe aktarırken her sayıyı teker
// teker Number() işleminden geçirmek yerine objeden integer karşılığını
// alırım dedim. neyse PMGN.parse fonksiyonunda açıklamaya çalışırım.
const stringMoves: Record<string, Move> = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6
};


/* -------- Sabitler -------- */





/* -------- Ana API -------- */


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


/* -------- Ana API -------- */




/* -------- Dışa aktarmalar -------- */


export { BadGameFileError, PMGN };


/* -------- Dışa aktarmalar -------- */