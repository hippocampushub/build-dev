import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useHhnb } from "../lib/hhnb";
import { COLLECTIONS, DATA_COLLECTIONS, pathOf } from "../lib/collections";
import { BuilderIcon, ChevronIcon, CloseIcon, MenuIcon } from "./Icons";
import { HhnbToast, HhnbTray } from "./HhnbTray";
import { FeedbackTab } from "./FeedbackTab";
import { TermsNotice } from "./TermsNotice";
import { useTerms } from "../lib/terms";

const CNR_URL = "https://www.ibf.cnr.it/";
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

// Top menu of the previous site (json_data/menu-items.json)
const HUB_URL = "https://www.hippocampushub.eu";
const EXTERNAL_MENU = [
  ["Explore Models", `${HUB_URL}/model`],
  ["Contact us", `${HUB_URL}/#contact-us`],
];

function BuildMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    // the menu also stays open while it has focus (:focus-within): drop it after following a link
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && ref.current?.contains(focused)) focused.blur();
  }, [location.pathname]);
  const active = location.pathname !== "/about";
  const accent = (c: (typeof COLLECTIONS)[number]) => ({ "--accent": c.accent }) as React.CSSProperties;

  return (
    <div ref={ref} className={`menu-group${open ? " open" : ""}`} onMouseLeave={() => setOpen(false)}>
      <span className={`menu-top${active ? " active" : ""}`}>
        <Link to="/" className="menu-top-link">Build Models</Link>
        <button
          className="menu-caret"
          aria-label="Build Models pages"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronIcon size={14} />
        </button>
      </span>
      <div className="submenu">
        <NavLink to="/data" end className="submenu-head">Data</NavLink>
        {DATA_COLLECTIONS.map((c) => (
          <NavLink key={c.key} to={c.path} className="submenu-sub" style={accent(c)}>
            {c.title}
          </NavLink>
        ))}
        <NavLink to={pathOf("model")} className="submenu-head">Models</NavLink>
      </div>
    </div>
  );
}

function Header() {
  const { count, setTrayOpen, added } = useHhnb();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="header">
      <div className="container header-inner">
        <a className="brand-logo" href={CNR_URL} target="_blank" rel="noreferrer" title="CNR – Istituto di Biofisica">
          <img src={asset("images/cnr_logo_white.svg")} alt="Consiglio Nazionale delle Ricerche" />
        </a>
        <Link to="/" className="brand">The Hippocampus Hub - Build Models</Link>
        <button
          className="menu-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
        <nav className={`nav${menuOpen ? " open" : ""}`} aria-label="Main">
          <a className="menu-top" href={HUB_URL}>Home</a>
          <BuildMenu />
          {EXTERNAL_MENU.map(([label, url]) => (
            <a key={label} className="menu-top" href={url}>{label}</a>
          ))}
        </nav>
        <button
          key={added?.id ?? 0}
          className={`hhnb-button${added ? " pulse" : ""}`}
          onClick={() => setTrayOpen(true)} aria-label={`HH Neuron Builder selection, ${count} items`}>
          <BuilderIcon size={22} />
          <span className="label">HH Neuron Builder</span>
          <span className="badge-count">{count}</span>
        </button>
      </div>
    </header>
  );
}

const LEGAL_LINKS = [
  ["terms_and_conditions", "Terms of Use"],
  ["privacy_and_cookie_policy", "Privacy Policy"],
  ["disclaimer", "Disclaimer"],
  ["privacy_and_cookie_policy", "Cookies"],
  ["contributors", "Contributors"],
];

/** Shows the statistics question again, so the choice can be changed (or consent withdrawn) at any time. */
function StatisticsPreferences() {
  const { statistics, setStatistics } = useTerms();
  const state = statistics === "granted" ? "accepted" : statistics === "denied" ? "rejected" : "not chosen";
  return (
    <button className="link-button footer-link-button" onClick={() => setStatistics(null)} title={`Statistics: ${state}`}>
      Statistics preferences
    </button>
  );
}

// Same content as the previous site's footer (json_data/config.json).
function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-cnr">
          <img src={asset("images/cnr_logo_white.svg")} alt="" />
          <span>
            Consiglio Nazionale delle Ricerche
            <br />
            Istituto di Biofisica
          </span>
        </div>
        <div className="footer-columns">
          <address>
            CNR-IBF
            <br />
            via Ugo La Malfa, 153
            <br />
            90146, Palermo
            <br />
            Italy
          </address>
          <ul className="footer-links">
            {LEGAL_LINKS.map(([anchor, label]) => (
              <li key={label}>
                <Link to={`/about#${anchor}`}>{label}</Link> - CNR-IBF
              </li>
            ))}
            <li>
              <StatisticsPreferences />
            </li>
          </ul>
        </div>
        <p className="footer-copyright">Copyright ©2021 CNR-IBF Hippocampus Facility Hub Project. All rights reserved.</p>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  useEffect(() => {
    // Links to an anchor (/about#disclaimer) scroll to it instead
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <>
      <a className="sr-only" href="#main">Skip to content</a>
      {import.meta.env.VITE_STAGING && (
        <div className="staging-banner">
          Test version · the live site is at <a href="https://www.hippocampushub.eu/build/">www.hippocampushub.eu/build</a>
        </div>
      )}
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <HhnbTray />
      <HhnbToast />
      <FeedbackTab />
      <TermsNotice />
    </>
  );
}
