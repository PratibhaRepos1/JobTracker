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
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-xl font-semibold text-slate-900">New application</h1>
      <p className="text-sm text-slate-600">
        Paste the JD, click <strong>Auto-fill</strong> to populate company/title/location/salary
        (fast, ~2s), edit anything that's wrong, then <strong>Tailor</strong> to generate a
        resume + cover letter (~15–20s).
      </p>

      <JobPasteForm onSubmit={(req) => mut.mutate(req)} loading={mut.isPending} />

      {mut.isError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md p-3">
          Tailoring failed: {(mut.error as Error).message}
        </div>
      )}
    </div>
  );
}
