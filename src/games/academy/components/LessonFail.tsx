import { useNavigate } from "@tanstack/react-router";
import { HeartCrack } from "lucide-react";
import { useAcademyStore } from "../store";

export function LessonFail() {
  const navigate = useNavigate();
  const retryLesson = useAcademyStore((s) => s.retryLesson);
  const returnToPath = useAcademyStore((s) => s.returnToPath);

  const handleRetry = () => {
    retryLesson();
  };

  const handleExit = () => {
    returnToPath();
    navigate({ to: "/hub/academy" });
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-red-100 text-[#E5484D]">
        <HeartCrack className="h-10 w-10" />
      </div>

      <h1 className="text-3xl font-black text-[#10204A]">Out of hearts!</h1>

      <p className="max-w-md text-lg font-semibold text-[#667085]">
        Don't worry — practice makes perfect. Give it another try!
      </p>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex h-12 items-center justify-center rounded-full border-2 border-[#E8ECF4] bg-white px-8 text-sm font-black text-[#667085] transition hover:bg-[#F4F7FB]"
        >
          Exit
        </button>
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex h-12 items-center justify-center rounded-full bg-[#FF3B8D] px-8 text-sm font-black text-white shadow-[0_4px_0_#e9327d] transition hover:brightness-110"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
