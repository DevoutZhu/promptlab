"use client";

import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="w-full px-4 pt-6 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">PromptLab</h1>
          <p className="text-sm text-gray-500 mt-1">大模型 Prompt 版本管理与 A/B 测试平台</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="space-y-8">
        <Section title="版本信息">
          <InfoRow label="版本号" value="v0.2.0" />
          <InfoRow label="许可证" value="Apache 2.0" />
          <InfoRow label="作者" value="Devout Zhu" />
        </Section>

        <Section title="技术栈">
          <InfoRow label="前端" value="Next.js 14 + React 18 + Tailwind CSS" />
          <InfoRow label="存储" value="JSON 文件存储" />
          <InfoRow label="LLM" value="DeepSeek / 通义千问（千问 DashScope）" />
          <InfoRow label="测试" value="Playwright E2E" />
        </Section>

        <Section title="API Key 状态">
          <InfoRow label="DeepSeek" value="已配置" />
          <InfoRow label="千问 (DashScope)" value="已配置" />
        </Section>

        <Section title="功能">
          <InfoRow label="多模型 A/B 评测" value="✅" />
          <InfoRow label="Prompt 版本管理" value="✅" />
          <InfoRow label="中英双语界面" value="✅" />
          <InfoRow label="CLI 命令行工具" value="✅" />
          <InfoRow label="E2E 自动化测试" value="✅" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
