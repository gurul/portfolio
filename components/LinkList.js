// The projects / communities / research list. Plain <a href> in the server
// HTML, so a crawler that never runs JavaScript still finds every link.
export default function LinkList({ items, label }) {
  return (
    <div className="projects-page-list" aria-label={label}>
      {items.map((item) => (
        <article key={item.name} className="projects-page-item">
          <p className="projects-page-title">
            <a href={item.href} target="_blank" rel="noreferrer">
              {item.name}
            </a>{" "}
            — {item.description}
          </p>
          {item.lines.map((line) => (
            <p key={line} className="projects-page-line">
              {line}
            </p>
          ))}
        </article>
      ))}
    </div>
  );
}
