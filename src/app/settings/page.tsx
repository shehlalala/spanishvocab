import type { Metadata } from "next";
import { SettingsForm } from "@/components/SettingsForm";

export const metadata: Metadata = { title: "Settings", robots: { index: false } };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-[520px] px-4 pt-3">
      <h1 className="mb-4 font-serif text-[1.9rem] leading-tight font-bold">Settings</h1>
      <SettingsForm />
    </main>
  );
}
