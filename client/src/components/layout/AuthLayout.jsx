import { Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { ROUND_META, ROUND_ORDER } from '../ui/meta.js';

/**
 * Signed-out shell. The left panel states what the product actually does —
 * the four rounds a student has to get through — rather than decorating
 * the login box.
 */
export default function AuthLayout() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between bg-brand p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/12 text-white">
            <GraduationCap size={19} strokeWidth={1.9} aria-hidden="true" />
          </span>
          <span className="font-display text-[15px] font-semibold text-white">Placement Prep</span>
        </div>

        <div className="max-w-[34ch]">
          <h2 className="font-display text-[34px] font-semibold leading-[1.15] text-white">
            Every round, one at a time.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65">
            Practice each stage of the placement process, get feedback on your answers, and build a
            resume from what you complete.
          </p>

          <ol className="mt-9 flex flex-col gap-3">
            {ROUND_ORDER.map((round, i) => (
              <li key={round} className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/10 text-[12px] font-semibold tabular-nums text-white/75">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-white">
                    {ROUND_META[round].label}
                  </span>
                  <span className="block text-[12.5px] text-white/50">{ROUND_META[round].blurb}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-[12.5px] text-white/40">
          Built for placement season preparation.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[26rem]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-white">
              <GraduationCap size={19} strokeWidth={1.9} aria-hidden="true" />
            </span>
            <span className="font-display text-[15px] font-semibold">Placement Prep</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
