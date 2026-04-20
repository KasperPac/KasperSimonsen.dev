import { Suspense } from "react";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact — Kasper Simonsen",
  description: "Get in touch about a project or engagement.",
};

export default function ContactPage() {
  return (
    <main>
      <Suspense>
        <ContactForm />
      </Suspense>
    </main>
  );
}
