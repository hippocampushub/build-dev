import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { COLLECTIONS } from "./lib/collections";
import { TermsProvider } from "./lib/terms";
import { HhnbProvider } from "./lib/hhnb";
import { Layout } from "./components/Layout";
import { About } from "./pages/About";
import { Browse } from "./pages/Browse";
import { Data } from "./pages/Data";
import { Home } from "./pages/Home";

// Short paths used by an earlier version of this site, kept working for existing links
const RENAMED = [
  ["/morphologies", "/data/morphology"],
  ["/electrophysiology", "/data/electrophysiology"],
  ["/connections", "/data/connection"],
  // pages of the previous site (www.hippocampushub.eu/build before v2)
  ["/index.html", "/"],
  ["/data.html", "/data"],
  ["/models.html", "/models"],
  ["/about.html", "/about"],
  ["/news.html", "/"],
  ["/tutorial.html", "/"],
  ["/contacts.html", "/about"],
  ["/workflows.html", "/"],
];

function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
}

function NotFound() {
  return (
    <div className="container" style={{ padding: "96px 0" }}>
      <div className="empty-state">
        <h2>Page not found</h2>
        <p>The page you are looking for does not exist.</p>
        <Link className="btn" to="/">Go to the overview</Link>
      </div>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <TermsProvider>
        <HhnbProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              {COLLECTIONS.map((c) => (
                // keyed: each list page starts fresh, so one page's items never meet another's sort
                <Route key={c.key} path={c.path} element={<Browse key={c.key} collection={c} />} />
              ))}
              <Route path="/data" element={<Data />} />
              {RENAMED.map(([from, to]) => (
                <Route key={from} path={from} element={<Redirect to={to} />} />
              ))}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </HhnbProvider>
      </TermsProvider>
    </BrowserRouter>
  );
}
