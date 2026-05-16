export type TailoredTab = "resume" | "cover";

interface Props {
  resumeMd: string;
  coverMd: string;
  onResumeChange?: (v: string) => void;
  onCoverChange?: (v: string) => void;
  editable?: boolean;
  tab: TailoredTab;
  onTabChange: (t: TailoredTab) => void;
}

export default function TailoredPreview({
  resumeMd,
  coverMd,
  onResumeChange,
  onCoverChange,
  editable = false,
  tab,
  onTabChange,
}: Props) {
  const tabCls = (active: boolean) =>
    `px-5 py-3 text-base font-semibold transition ${
      active
        ? "text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/40"
        : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/20"
    }`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-md flex flex-col">
      <div className="border-b border-slate-200 flex">
        <button onClick={() => onTabChange("resume")} className={tabCls(tab === "resume")}>
          📄 Resume
        </button>
        <button onClick={() => onTabChange("cover")} className={tabCls(tab === "cover")}>
          ✉️ Cover letter
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
            className="w-full h-[600px] font-mono text-sm leading-relaxed border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-800 max-h-[600px] overflow-y-auto">
            {tab === "resume" ? resumeMd : coverMd}
          </pre>
        )}
      </div>
    </div>
  );
}
