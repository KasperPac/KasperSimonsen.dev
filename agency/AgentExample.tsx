import { aiExample } from "./content";
import Tick from "./Tick";

/*
 * The three screens of the made-up example in the AI section, one per step. They are pictures of screens,
 * not controls: each is hidden from assistive technology, where the step's own description stands in, and
 * the "buttons" are plain text that cannot take focus.
 */

function EnquiryScreen() {
  const { initials, from, meta, status, message } = aiExample.enquiry;
  return (
    <div className="agent-screen" aria-hidden="true">
      <div className="agent-screen-head">
        <span className="agent-screen-avatar">{initials}</span>
        <div><p className="agent-screen-title">{from}</p><p className="agent-screen-meta">{meta}</p></div>
        <span className="agent-screen-status">{status}</span>
      </div>
      <p className="agent-screen-message">{message}</p>
    </div>
  );
}

function AgentScreen() {
  const { title, meta, checks } = aiExample.agent;
  return (
    <div className="agent-screen" aria-hidden="true">
      <div className="agent-screen-head">
        <div><p className="agent-screen-title">{title}</p><p className="agent-screen-meta">{meta}</p></div>
      </div>
      <ul className="agent-checks">
        {checks.map((check) => (
          <li key={check.text}>{check.done ? <span className="tick-badge"><Tick /></span> : <span className="agent-check-open" />}{check.text}</li>
        ))}
      </ul>
    </div>
  );
}

function DraftScreen() {
  const { title, meta, status, message, actions } = aiExample.draft;
  return (
    <div className="agent-screen" aria-hidden="true">
      <div className="agent-screen-head">
        <div><p className="agent-screen-title">{title}</p><p className="agent-screen-meta">{meta}</p></div>
        <span className="agent-screen-status">{status}</span>
      </div>
      <p className="agent-screen-message">{message}</p>
      <div className="agent-screen-actions">
        <span className="agent-screen-action">{actions[0]}</span>
        <span className="agent-screen-action agent-screen-action-main">{actions[1]}</span>
      </div>
    </div>
  );
}

/** In step order: the customer's enquiry, the agent's checklist, the draft waiting for approval. */
export const exampleScreens = [EnquiryScreen, AgentScreen, DraftScreen] as const;
