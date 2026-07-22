import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PromptLab - 大模型 Prompt 管理平台",
  description: "开源的 Prompt 版本管理与 A/B 测试平台，像管理代码一样管理你的 Prompt。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" translate="no" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1 bg-gray-50">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
