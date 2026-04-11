"use client";

import { useState } from "react";
import { MarkdownRenderer } from "./markdown-renderer";

type Tab = "write" | "preview";

export function MarkdownEditor({
  name,
  defaultValue = "",
  placeholder = "마크다운으로 작성해주세요. **굵게**, _기울임_, `코드`, ```블록``` 모두 지원됩니다.",
  rows = 14,
  required = false,
  minLength,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  minLength?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<Tab>("write");

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div role="tablist" className="flex border-b border-zinc-200 bg-zinc-50">
        <TabButton active={tab === "write"} onClick={() => setTab("write")}>
          작성
        </TabButton>
        <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
          미리보기
        </TabButton>
      </div>

      {/* Textarea stays mounted in both tabs so form submission always sees its value */}
      <div className={tab === "write" ? "block" : "hidden"}>
        <textarea
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          className="block w-full resize-y border-0 px-4 py-3 font-mono text-sm leading-6 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>

      <div
        className={`min-h-[200px] px-4 py-3 ${tab === "preview" ? "block" : "hidden"}`}
      >
        {value.trim() ? (
          <MarkdownRenderer content={value} />
        ) : (
          <p className="text-sm text-zinc-400">미리볼 내용이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-b-2 border-zinc-900 text-zinc-900"
          : "text-zinc-500 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}
