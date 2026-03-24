export default function PageScaffold({ children, scrollable = false }) {
  return (
    <main className={scrollable ? "page-shell page-shell--scrollable" : "page-shell"}>
      <section className="intro-grid">
        <div className="intro-spacer" aria-hidden="true" />
        <div className="copy-column">{children}</div>
      </section>
    </main>
  );
}
