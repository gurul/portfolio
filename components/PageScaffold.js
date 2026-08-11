import DecodeIntro from "./DecodeIntro";
import {
  PAGE_DECODE_DONE_EVENT,
  WATERFALL_DONE_EVENT,
} from "../lib/textDecode";

export default function PageScaffold({ children, scrollable = false }) {
  return (
    <main className={scrollable ? "page-shell page-shell--scrollable" : "page-shell"}>
      <section className="intro-grid">
        <div className="intro-spacer" aria-hidden="true" />
        <div className="copy-column">{children}</div>
      </section>
      {/* Remounts with the page, so the copy decodes on every navigation.
          The narratives line listens for the done event and takes the last
          step of the waterfall itself. */}
      <DecodeIntro
        selector=".page-shell"
        exclude=".currently-reading"
        reveal=".commit-history-viewport"
        doneEvent={PAGE_DECODE_DONE_EVENT}
        finalEvent={WATERFALL_DONE_EVENT}
        finalUnless=".currently-reading"
      />
    </main>
  );
}
