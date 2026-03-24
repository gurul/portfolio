import Link from "next/link";
import PageScaffold from "../../components/PageScaffold";

export default function BlogPage() {
  return (
    <PageScaffold>
      <section className="blog-list" aria-label="Blog posts">
        <p className="blog-list-item">
          <Link className="blog-title-link" href="/blog/the-voice-with-vision">
            the voice with vision
          </Link>
        </p>
        <p className="blog-list-item">
          <Link className="blog-title-link" href="/blog/cauldron">
            cauldron
          </Link>
        </p>
      </section>
    </PageScaffold>
  );
}
