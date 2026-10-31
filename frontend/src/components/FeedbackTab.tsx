import { useEffect, useRef, useState, type FormEvent } from "react";
import { CloseIcon, ExternalIcon } from "./Icons";

// Feedback tab on the right edge, with the previous site's form: type, page section,
// description (required) and contact. The previous site posted it through a relay
// (feedback-proxy-bsp-epfl.apps.hbp.eu, no longer reachable); here "Send" opens a new
// GitHub issue with the same title and body, which the visitor submits on GitHub.
const ISSUES_URL = "https://github.com/hippocampushub/build/issues/new";
const CONTACT_KEY = "hh-build:feedback-contact";
const FEEDBACK_EMAIL = "info@hippocampushub.eu";

const TYPES = [
  ["content", "Content"],
  ["layout", "Layout, UI"],
  ["navigation", "Navigation, UX"],
];

function readContact() {
  try {
    return sessionStorage.getItem(CONTACT_KEY) ?? "";
  } catch {
    return "";
  }
}

function issueUrl(type: string, component: string, details: string, contact: string) {
  const page = window.location.href;
  const body = [
    "Field | Element",
    "--- | ---",
    `Issue type | ${type || "--"}`,
    `Page URL | [${window.location.pathname}${window.location.search}](${page})`,
    `Component | ${component || "--"}`,
    `Contact | ${contact || "--"}`,
    "",
    details,
  ].join("\n");
  const params = new URLSearchParams({ title: details.slice(0, 100), labels: "section: build", body });
  return `${ISSUES_URL}?${params}`;
}

function mailtoUrl(type: string, component: string, details: string) {
  const lines = [`Page: ${window.location.href}`];
  if (type) lines.push(`Feedback type: ${type}`);
  if (component) lines.push(`Component: ${component}`);
  lines.push("", details);
  const params = new URLSearchParams({ subject: "Hippocampus Hub Build feedback", body: lines.join("\n") });
  // mailto wants %20 for spaces, not "+"
  return `mailto:${FEEDBACK_EMAIL}?${params.toString().replace(/\+/g, "%20")}`;
}

export function FeedbackTab() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [component, setComponent] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState(readContact);
  const [sent, setSent] = useState(false);
  const typeRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!open) return;
    typeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    if (sent) {
      setType("");
      setComponent("");
      setDetails("");
      setSent(false);
    }
  };

  const onContactChange = (value: string) => {
    setContact(value);
    try {
      sessionStorage.setItem(CONTACT_KEY, value);
    } catch {
      // storage unavailable: the contact is just not remembered
    }
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!details.trim()) return;
    window.open(issueUrl(type, component.trim(), details.trim(), contact.trim()), "_blank", "noopener");
    setSent(true);
  };

  return (
    <>
      <button className="feedback-tab" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}>
        Feedback
      </button>
      {open && (
        <form className="feedback-form" onSubmit={send} aria-label="Feedback">
          <button type="button" className="feedback-close" onClick={close} aria-label="Close feedback">
            <CloseIcon size={16} />
          </button>
          <h2>Feedback</h2>
          <p className="feedback-intro">Open an issue with your GitHub account</p>
          <label>
            <span>Feedback type (optional)</span>
            <select ref={typeRef} className="select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">–</option>
              {TYPES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Component / page section (optional)</span>
            <input className="field" value={component} onChange={(e) => setComponent(e.target.value)} />
          </label>
          <label>
            <span>Description</span>
            <textarea
              className="field"
              rows={4}
              required
              placeholder="Tell us about your experience..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </label>
          <label>
            <span>Contact name / email (optional)</span>
            <input className="field" type="text" autoComplete="email" value={contact} onChange={(e) => onContactChange(e.target.value)} />
          </label>
          <p className="feedback-note">Send opens a pre-filled issue on GitHub. The issue is public, including the contact you enter.</p>
          <div className="feedback-actions">
            {sent && <span className="feedback-sent">Opened on GitHub, thank you!</span>}
            <button type="submit" className="btn btn-sm feedback-send" disabled={!details.trim()}>
              Send <ExternalIcon size={14} />
            </button>
          </div>
          <p className="feedback-email">
            Or send an email to{" "}
            <a href={mailtoUrl(type, component.trim(), details.trim())}>{FEEDBACK_EMAIL}</a>
          </p>
        </form>
      )}
    </>
  );
}
