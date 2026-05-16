import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import JobPasteForm from "../components/JobPasteForm";
import { tailor } from "../lib/api";
import type { TailorRequest } from "../types";

export default function NewApplication() {
  const navigate = useNavigate();

  const mut = useMutation({
    mutationFn: (req: TailorRequest) => tailor(req),
    onSuccess: (data, vars) => {
      // Hand off the tailored output + the original request to the review page via router state.
      navigate("/review", {
        state: { tailored: data, request: vars },
      });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">New application</h1>
        <p className="text-base text-slate-600 mt-2">
          Paste the JD, click <strong className="text-indigo-700">Auto-fill</strong> to populate
          company/title/location/salary (~2s), edit anything that's wrong, then{" "}
          <strong className="text-indigo-700">Tailor</strong> to generate a resume + cover letter
          (~15–20s).
        </p>
      </div>

      <JobPasteForm onSubmit={(req) => mut.mutate(req)} loading={mut.isPending} />

      {mut.isError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 text-base rounded-lg p-4 shadow-sm">
          <strong>Tailoring failed:</strong> {(mut.error as Error).message}
        </div>
      )}
    </div>
  );
}
