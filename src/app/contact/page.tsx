"use client";

import { useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("https://formspree.io/f/mzdojyor", {
        method: "POST",
        body: new FormData(e.currentTarget as HTMLFormElement),
        headers: { Accept: "application/json" },
      });
      setStatus(res.ok ? "done" : "idle");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="pt-8 pb-16 md:pt-24 md:pb-24">
      <div className="max-w-xl mx-auto px-6">
        <h1 className="text-xs tracking-[0.4em] uppercase text-neutral-400 mb-4">
          Contact
        </h1>
        <p className="text-sm text-neutral-500 mb-16 leading-relaxed">
          撮影依頼・展示のご相談など、お気軽にご連絡ください。
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
                className="w-full border-b border-neutral-200 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent placeholder:text-neutral-300"
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
                className="w-full border-b border-neutral-200 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent placeholder:text-neutral-300"
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
                className="w-full border-b border-neutral-200 py-2 text-sm outline-none focus:border-black transition-colors bg-transparent resize-none placeholder:text-neutral-300"
                placeholder="メッセージ"
              />
            </div>

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
