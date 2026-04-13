"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SECURITY_QUESTIONS = [
  "你的宠物叫什么名字？",
  "你出生在哪个城市？",
  "你母亲的姓氏是什么？",
  "你第一所学校的名字是什么？",
  "你最喜欢的书是什么？",
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswer: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.confirmPassword ||
      !form.securityAnswer
    ) {
      setError("请填写所有字段");
      return;
    }

    if (form.password.length < 6) {
      setError("密码至少6位");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("两次密码输入不一致");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        securityQuestion: form.securityQuestion,
        securityAnswer: form.securityAnswer,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "注册失败");
      return;
    }

    router.push("/login?registered=1");
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
        注册
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            姓名
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入姓名"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            邮箱
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入邮箱"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密码
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="至少6位"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            确认密码
          </label>
          <input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="再次输入密码"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密保问题
          </label>
          <select
            value={form.securityQuestion}
            onChange={(e) => update("securityQuestion", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            密保答案
          </label>
          <input
            type="text"
            value={form.securityAnswer}
            onChange={(e) => update("securityAnswer", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入密保答案"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "注册中..." : "注册"}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-gray-600">
        <p>
          已有账号？{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            去登录
          </Link>
        </p>
      </div>
    </>
  );
}
