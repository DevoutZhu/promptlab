"use client";

import { LanguageSwitcher, useLanguage } from "@/lib/i18n";

export default function DocsPage() {
  return (
    <div className="w-full px-4 pt-6 pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">文档</h1>
          <p className="text-sm text-gray-500 mt-1">PromptLab 使用指南</p>
        </div>
        <LanguageSwitcher />
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">快速开始</h2>
          </div>
          <div className="p-5 space-y-3 text-sm text-gray-600">
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
              git clone https://github.com/DevoutZhu/promptlab.git<br />
              cd promptlab<br />
              pnpm install && pnpm dev
            </div>
            <p>打开 http://localhost:3000 即可使用。</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">配置 LLM API Key</h2>
          </div>
          <div className="p-5 space-y-3 text-sm text-gray-600">
            <p>在项目根目录创建 <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env.local</code> 文件：</p>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs">
              OPENAI_BASE_URL=https://api.deepseek.com/v1<br />
              OPENAI_API_KEY=sk-xxx<br />
              DASHSCOPE_API_KEY=sk-xxx
            </div>
            <p>支持 DeepSeek 和通义千问，也兼容任何 OpenAI 接口的服务。</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">创建 A/B 实验</h2>
          </div>
          <div className="p-5 space-y-3 text-sm text-gray-600">
            <ol className="list-decimal list-inside space-y-2">
              <li>创建一个 Prompt，保存至少两个版本</li>
              <li>在 Prompt 详情页点击"新建实验"</li>
              <li>系统自动对比 v1 和 v2，调用 LLM 评测</li>
              <li>查看评分结果，数据驱动决策</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
