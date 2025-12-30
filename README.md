# galaman
Türk mangalası motoru.

> [!IMPORTANT]
> Şu an proje geliştirme aşamasındadır. Elimde sadece CLI prototipi var şimdilik onu yükledim. Lütfen gelişim sürecinde katkıda bulunun.

> [!NOTE]
> Başka projelerime bakıp kod yazım tarzımı beğenmemiş olabilirsiniz ama bu projede olabildiğince temiz ve açık yazmaya çalıştım. Lütfen bir şans verip TypeScript okuyabiliyorsanız `/src/shared/modules/galaman.ts` dosyasına göz atın.

## Kurulum
Kurulum için:
```
git clone https://github.com/sanalzio/galaman.git
cd galaman
bun install .
```
Çalıştırma için:
```
bun run cli
```


## Uzun ve sıkıcı açıklamalar (ama bence önemliler)

Satranç oyunu için tasarlanmış olan oyun ve analiz motorlarından biriyle vakit geçirirken bende Türk mangalası için profesyonel bir motor yapayım dedim ve bu fikir ortaya çıktı. Evet ismi pek yaratıcı değil ve kulağa özel olarak hoş falan gelmiyor ama deponun adı `galaman` işte yani. Öyle.

Bu projede, herhangi bir yerde gördüğüm minimax algoritmasını denedim.

Hedefim bu motorun grafik arayüzünü (GUI) [en-croissant](https://github.com/franciscoBSalgueiro/en-croissant) projesindeki arayüze benzetmek olacak. Modern gözüküp profesyonel havası vermesi beni cezbetti açıkçası. Arayüzü dümdüz HTML, CSS, TS ile yazmayı planlıyorum. (React bilmediğim için.) Yapay zekası ile bile JavaScript'te sorunsuz çalışabildiği için şimdilik çalıştırılabilir (executable) dosya halinde tasarlama hedefim yok. Önce PWA'ya uyarlayıp belki electron olmadan düz webview ile hazırlarım diye düşünüyorum.

Projenin henüz CLI dışında bir şekli şevali yok, GUI için tasarım planları tasarlayıp, kolumu sıvayıp girişeceğim. Harbiden React bilmiyorum bu arada dümdüz HTML, CSS, TS ile yazacağım.

Lütfen projeye bir el uzatın şimdilik motor fonksiyonlarını iyileştirmek veya ekleme yapmak gibi el atsanız çok yardımcı olursunuz.
