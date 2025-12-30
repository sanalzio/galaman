/* --------- ---------- Açıklama ------- ------------ *\

    Önemsiz bir kod, /src/cli/index.ts dosyasında
  kullanıcı girdisi almak için yapay zekaya
  readLine fonksiyonunu yazdırıp redInt gibi
  türettim. Zaten sadece readInt işlevini kullandım.
  Projemle pek alakası olmadığı için önem vermeyeceğim.

\* -------------- ----- Açıklama ------ ------------- */




import readline from "node:readline/promises";
import process from "process";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

export async function readLine(
    prompt: string = ""
): Promise<string> {
    return await rl.question(prompt);
}

export async function readNumber(
    prompt: string = "",
    errMsg: string = "Geçerli bir sayı girin.\n"
): Promise<number> {
    let isntNaN: boolean;
    while (!isntNaN) {
        const answer = await rl.question(prompt);
        const n = Number(answer.trim());
        if (isNaN(n)) {
            console.write(errMsg);
            continue;
        }
        isntNaN = true;
        return n;
    }
}

export async function readInt(
    prompt: string = "",
    errMsg: string = "Geçerli bir tamsayı girin.\n"
): Promise<number> {
    let isntNaN: boolean;
    while (!isntNaN) {
        const answer = await rl.question(prompt);
        const n = parseInt(answer.trim());
        if (isNaN(n)) {
            console.write(errMsg);
            continue;
        }
        isntNaN = true;
        return n;
    }
}

export async function readFloat(
    prompt: string = "",
    errMsg: string = "Geçerli bir ondalıklı sayı girin.\n"
): Promise<number> {
    let isntNaN: boolean;
    while (!isntNaN) {
        const answer = await rl.question(prompt);
        const n = parseFloat(answer.trim());
        if (isNaN(n)) {
            console.write(errMsg);
            continue;
        }
        isntNaN = true;
        return n;
    }
}
