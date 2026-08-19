import Image from "next/image";
import JsonLd from "@/components/JsonLd";
import BackLink from "@/components/BackLink";
import { seriesLd, breadcrumb } from "@/lib/structured-data";

// 並びは撮影日順ではなく編集した順。年は「箱」であって編集ではないので、
// 中の順番だけは選ぶ（羅列にしない）。設計:
//   1  膜の中の丸い光＝この年の語彙を最初に置く
//   2-6  静かな影 → 一点色（黄）で目を覚まし → 膜（車窓）へ
//   7-8  屋内へ入る（光の矩形・生活）
//   9-12  面に落ちる影のまとまり＝この年の主旋律
//   13   一人称は「自分の影」1枚だけ中盤に置く
//   14-17 外へ出て引きの街へ
//   18-20 人が現れ、赤でつなぐ
//   21   唯一の直接光（夕日）で閉じる
const photos = [
  "/images/cast-08.jpg",
  "/images/trace-05.jpg",
  "/images/cast-03.jpg",
  "/images/trace-10.jpg",
  "/images/cast-01.jpg",
  "/images/trace-01.jpg",
  "/images/ordinary-03.jpg",
  "/images/ordinary-08.jpg",
  "/images/cast-07.jpg",
  "/images/trace-02.jpg",
  "/images/trace-11.jpg",
  "/images/trace-07.jpg",
  "/images/trace-12.jpg",
  "/images/cast-02.jpg",
  "/images/cast-05.jpg",
  "/images/trace-04.jpg",
  "/images/trace-09.jpg",
  "/images/trace-03.jpg",
  "/images/ordinary-06.jpg",
  "/images/trace-08.jpg",
  "/images/cast-06.jpg",
];

export default function Works2026() {
  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd data={seriesLd({ slug: "2026", name: "2026", year: "2026", images: photos })} />
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Works", path: "/works" },
          { name: "2026", path: "/works/2026" },
        ])}
      />
      <div className="max-w-5xl mx-auto px-6">
        <div className="mb-16">
          <h1 className="text-2xl font-light mb-2">2026</h1>
          <p className="text-xs tracking-[0.2em] text-neutral-400 uppercase">
            {photos.length} photographs
          </p>
        </div>

        {/* 年でまとめると枚数が増えるので、1枚=1画面の縦積みだとスクロールが持たない。
            拡大や大小の強弱は足さず、2列にしてブロック数を半分にする（縦横比はそのまま・切り抜かない）。
            スマホは1列（2列にすると写真が小さくなりすぎる）。 */}
        <div className="space-y-10 md:grid md:grid-cols-2 md:gap-x-10 md:gap-y-12 md:space-y-0 md:items-center">
          {photos.map((src, i) => (
            <div key={src} className="flex items-center justify-center">
              <Image
                src={src}
                alt={`Takuto Suzuki — 2026, ${i + 1}`}
                width={1800}
                height={1200}
                priority={i === 0}
                className="max-h-[70vh] md:max-h-[62vh] max-w-full w-auto object-contain"
              />
            </div>
          ))}
        </div>

        <BackLink href="/works" label="Works" />
      </div>
    </div>
  );
}
