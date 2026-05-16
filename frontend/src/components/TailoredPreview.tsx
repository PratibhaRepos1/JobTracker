import { useState } from "react";

interface Props {
  resumeMd: string;
  coverMd: string;
  onResumeChange?: (v: string) => void;
  onCoverChange?: (v: string) => void;
  editable?: boolean;
}

type Tab = "resume" | "cover";

export default function TailoredPreview({
  resumeMd,
  coverMd,
  onResumeChange,
  onCoverChange,
  editable = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("resume");

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
      <div className="border-b border-slate-200 flex">
        <button
          onClick={() => setTab("resume")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "resume"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Resume
        </button>
        <button
          onClick={() => setTab("cover")}
          className={`px-4 py-2 text-sm font-medium ${
            tab === "cover"
              ? "text-slate-900 border-b-2 border-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Cover letter
        </button>
      </div>

      <div className="p-4 flex-1">
        {editable ? (
          <textarea
            value={tab === "resume" ? resumeMd : coverMd}
            onChange={(e) =>
              tab === "resume"
                ? onResumeChange?.(e.target.value)
                : onCoverChange?.(e.target.value)
            }
            className="w-full h-[600px] font-mono text-xs leading-relaxed border border-slate-200 rounded p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-800 max-h-[600px] overflow-y-auto">
            {tab === "resume" ? resumeMd : coverMd}
          </pre>
        )}
      </div>
    </div>
  );
}
