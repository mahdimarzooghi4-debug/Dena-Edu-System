"use client";

import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";

const choices = [
  { id: "six", label: "۶" },
  { id: "minus-six", label: "−۶" },
  { id: "five", label: "۵" },
  { id: "minus-five", label: "−۵" },
];

export function DemoPracticeCard() {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const correct = answer === "six";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answer) setSubmitted(true);
  }

  return (
    <Card className="space-y-5 rounded-[22px] p-6 md:p-8">
      <div>
        <p className="text-sm font-bold text-dena-brand">ریاضی پایه هفتم · تمرین نمونه</p>
        <h2 className="mt-3 text-xl font-extrabold leading-9 text-dena-deep">
          حاصل ضرب (−۳) × (−۲) کدام است؟
        </h2>
        <p className="mt-2 text-sm text-dena-muted">یک گزینه را انتخاب کن.</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-3" aria-label="گزینه‌های پاسخ">
          {choices.map((choice) => (
            <label
              key={choice.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${answer === choice.id ? "border-dena-brand bg-dena-lavender" : "border-dena-border bg-white"}`}
            >
              <input
                type="radio"
                name="demo-practice-answer"
                value={choice.id}
                checked={answer === choice.id}
                onChange={() => {
                  setAnswer(choice.id);
                  setSubmitted(false);
                }}
                className="size-4 accent-dena-brand"
              />
              <span className="font-semibold text-dena-ink">{choice.label}</span>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={!answer} className={buttonClassName()}>
          بررسی پاسخ
        </button>
      </form>
      {submitted && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm leading-7 ${correct ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}
        >
          <p className="font-extrabold">{correct ? "پاسخ درست است." : "این گزینه درست نیست."}</p>
          <p className="mt-1">در ضرب دو عدد منفی، حاصل مثبت می‌شود: (−۳) × (−۲) = ۶.</p>
          <p className="mt-2 text-xs">نتیجه فقط در همین صفحهٔ نمایشی محاسبه می‌شود و جایی ذخیره نمی‌شود.</p>
        </div>
      )}
    </Card>
  );
}
