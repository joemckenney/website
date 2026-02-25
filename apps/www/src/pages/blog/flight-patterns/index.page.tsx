import { Link } from "react-router-dom";
import { BackLink } from "../../../components/back-link";
import { getSeriesPosts } from "../../../lib/posts";
import {
  comingSoon,
  description,
  header,
  page,
  postDescription,
  postItem,
  postItemDraft,
  postList,
  postTitle,
  title,
} from "./index.css";

export default function FlightPatterns() {
  const posts = getSeriesPosts("flight-patterns");

  return (
    <div className={page}>
      <header className={header}>
        <BackLink to="/blog" label="Writing" />
        <h1 className={title}>Flight Patterns</h1>
        <p className={description}>
          Self-hosting a Kubernetes cluster on a machine under my desk.{" "}
          <a href="https://github.com/joemckenney/website">
            The long way around
          </a>
          .
        </p>
      </header>

      <ul className={postList}>
        {posts.map((post) =>
          post.draft ? (
            <li key={post.slug} className={postItemDraft}>
              <span className={postTitle}>{post.title}</span>
              <span className={postDescription}>{post.description}</span>
              <span className={comingSoon}>Coming soon</span>
            </li>
          ) : (
            <li key={post.slug} className={postItem}>
              <Link to={post.slug}>
                <span className={postTitle}>{post.title}</span>
                <span className={postDescription}>{post.description}</span>
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
