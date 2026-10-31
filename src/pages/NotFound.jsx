import { Link } from "react-router-dom";
export default function NotFound() {
  return (
    <div className="p-10">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-2 text-muted">That address doesn't exist, or you don't have access to it.</p>
      <Link className="btn btn-primary mt-4" to="/">Go to your home page</Link>
    </div>
  );
}
