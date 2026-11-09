import type { Metadata } from "next";
import { CONTACT_NAME } from "@/content/contact";
import { COPY } from "@/office/copy";
import OfficeExperience from "@/office/OfficeExperience";

export const metadata: Metadata = {
  title: `Interactive Office — ${CONTACT_NAME}`,
  alternates: { canonical: "/office" },
};

export default function OfficePage() {
  return (
    <main>
      <h1 className="visually-hidden">{CONTACT_NAME}, {COPY.entry.role}</h1>
      <OfficeExperience />
    </main>
  );
}
