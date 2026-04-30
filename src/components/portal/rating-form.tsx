"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Star } from "lucide-react";

import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function RatingForm({ applicationId, existingRating }: { applicationId: string; existingRating?: number }) {
  const [rating, setRating] = useState(existingRating ?? 5);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const submitRating = () => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/applications/${applicationId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, feedback }),
        });
        const result = (await response.json()) as { message: string };

        if (!response.ok) {
          throw new Error(result.message);
        }

        showToast(result.message);
      } catch (error) {
        showToast(error instanceof Error ? error.message : "Rating could not be saved.", "error");
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="font-bold text-slate-950">Rate this service</p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((item) => (
          <button key={item} type="button" onClick={() => setRating(item)} className="rounded-full p-1">
            <Star className={cn("h-6 w-6", item <= rating ? "fill-orange-400 text-orange-400" : "text-slate-300")} />
          </button>
        ))}
      </div>
      <Textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        placeholder="Feedback"
        className="mt-3 min-h-24"
      />
      <Button type="button" onClick={submitRating} disabled={isPending} className="mt-3">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        Save Rating
      </Button>
    </div>
  );
}
