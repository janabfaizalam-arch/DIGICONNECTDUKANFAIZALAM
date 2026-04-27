"use client";

import { type FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { services } from "@/lib/constants";
import { useToast } from "@/components/providers/toast-provider";

const initialState = {
  name: "",
  mobile: "",
  service: "",
  message: "",
};

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = 5 * 1024 * 1024;

export function LeadForm() {
  const [form, setForm] = useState(initialState);
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (file && !allowedFileTypes.includes(file.type)) {
      showToast("File PDF, JPG ya PNG format me upload karein.", "error");
      return;
    }

    if (file && file.size > maxFileSize) {
      showToast("File 5MB se chhoti honi chahiye.", "error");
      return;
    }

    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("mobile", form.mobile);
    formData.set("service", form.service);
    formData.set("message", form.message);

    if (file) {
      formData.set("file", file);
    }

    startTransition(async () => {
      const response = await fetch("/api/lead", {
        method: "POST",
        body: formData,
      });
      const text = await response.text();
      let result: { message?: string; error?: string };

      try {
        result = JSON.parse(text) as { message?: string; error?: string };
      } catch {
        result = { error: text || "Server response valid nahi hai." };
      }

      const message = result.message ?? result.error ?? "Lead submit nahi ho paya.";
      setFeedback(message);

      if (response.ok) {
        setForm(initialState);
        setFile(null);
        event.currentTarget.reset();
        showToast(message);
      } else {
        showToast(message, "error");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Name"
          name="name"
          required
        />
        <Input
          value={form.mobile}
          onChange={(event) => setForm((current) => ({ ...current, mobile: event.target.value }))}
          placeholder="Mobile Number"
          name="mobile"
          inputMode="numeric"
          pattern="[0-9]{10}"
          required
        />
      </div>
      <Select value={form.service} onValueChange={(value) => setForm((current) => ({ ...current, service: value }))}>
        <SelectTrigger aria-label="Select Service">
          <SelectValue placeholder="Select Service" />
        </SelectTrigger>
        <SelectContent>
          {services.map((service) => (
            <SelectItem key={service.title} value={service.title}>
              {service.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Textarea
        value={form.message}
        onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
        placeholder="Message"
        name="message"
      />
      <Input
        type="file"
        name="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <Button type="submit" size="lg" className="w-full md:w-auto" disabled={isPending}>
        {isPending ? "Submitting..." : "Aaj hi apply karein"}
      </Button>
      {feedback ? <p className="text-sm font-medium text-slate-600">{feedback}</p> : null}
    </form>
  );
}
