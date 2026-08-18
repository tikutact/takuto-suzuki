"use client";

import { useState } from "react";
import JsonLd from "@/components/JsonLd";
import {
  breadcrumb,
  CONTACT_EMAIL,
  mailtoWithSubject,
} from "@/lib/structured-data";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // FormData は await をまたぐと currentTarget が null になるので先に作る
    const data = new FormData(e.currentTarget as HTMLFormElement);
    // Formspree の _subject。付けないと既定の件名で届き、Gmail側の
    // 「【takutosuzuki.com】」フィルタに掛からず3事業のメールに埋もれる。
    // 不良品の連絡もこのフォームが窓口なので、埋もれると法定の対応期限を落とす。
    data.append("_subject", "【takutosuzuki.com】お問い合わせ");
    setStatus("sending");
    try {
      const res = await fetch("https://formspree.io/f/mzdojyor", {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      // 失敗を "idle" に戻すと成功と区別がつかず、送れたつもりで離脱される。
      // 商品の不良品連絡もこのフォームが窓口なので、必ずエラーを見せる。
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <JsonLd
        data={breadcrumb([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-4">
          Contact
        </h1>
        <p className="text-sm text-neutral-500 mb-4 leading-relaxed">
          撮影依頼・展示のご相談、ご購入いただいた商品についてのお問い合わせなど、
          お気軽にご連絡ください。
        </p>
        <p className="text-sm text-neutral-400 mb-16 leading-relaxed">
          メールでも受け付けています:{" "}
          <a
            href={mailtoWithSubject("【takutosuzuki.com】お問い合わせ")}
            className="underline underline-offset-4 hover:text-black transition-colors"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        {status === "done" ? (
          <div className="py-16 text-center">
            <p className="text-sm text-neutral-600 tracking-wide">
              ありがとうございます。<br />
              内容を確認次第、ご連絡いたします。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-2">
                Name
              </label>
              <input
                type="text"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                className="w-full border-b border-neutral-200 py-2 text-base md:text-sm outline-none focus:border-black transition-colors bg-transparent placeholder:text-neutral-300"
                placeholder="お名前"
              />
            </div>

            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                required
                value={form.email}
                onChange={handleChange}
                className="w-full border-b border-neutral-200 py-2 text-base md:text-sm outline-none focus:border-black transition-colors bg-transparent placeholder:text-neutral-300"
                placeholder="メールアドレス"
              />
            </div>

            <div>
              <label className="block text-xs tracking-[0.2em] uppercase text-neutral-400 mb-2">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={6}
                value={form.message}
                onChange={handleChange}
                className="w-full border-b border-neutral-200 py-2 text-base md:text-sm outline-none focus:border-black transition-colors bg-transparent resize-none placeholder:text-neutral-300"
                placeholder="メッセージ"
              />
            </div>

            {status === "error" && (
              <div className="border border-neutral-300 px-4 py-4">
                <p className="text-sm text-neutral-700 leading-relaxed">
                  送信できませんでした。
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed mt-2">
                  お手数ですが、時間をおいて再度お試しいただくか、
                  <a
                    href={mailtoWithSubject("【takutosuzuki.com】お問い合わせ")}
                    className="underline underline-offset-4 hover:text-black transition-colors"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  宛に直接メールをお送りください。
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full border border-black py-3 text-xs tracking-[0.3em] uppercase hover:bg-black hover:text-white transition-colors duration-300 disabled:opacity-40"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
