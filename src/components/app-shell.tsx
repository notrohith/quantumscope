"use client";
import { projectScope } from "@/lib/scientific-copy";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Atom,
  LayoutDashboard,
  Orbit,
  Activity,
  Radar,
  GitCompareArrows,
  Table2,
  BookOpen,
  Presentation,
  Menu,
  X,
  PanelLeftClose,
} from "lucide-react";
import { HistoryNotice } from "./platform-provider";
import { BackendStatus } from "./backend-status";
import { StatusBadge } from "./shared";
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/entanglement", label: "Entanglement Lab", icon: Orbit },
  { href: "/noise", label: "Noise Lab", icon: Activity },
  { href: "/illumination", label: "Quantum Illumination", icon: Radar },
  { href: "/comparison", label: "Quantum vs Control", icon: GitCompareArrows },
  { href: "/results", label: "Experiment Results", icon: Table2 },
  { href: "/demo-guide", label: "Demo Guide", icon: Presentation },
  { href: "/methodology", label: "Methodology", icon: BookOpen },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
      wasOpen.current = true;
    } else if (wasOpen.current) {
      menuRef.current?.focus();
      wasOpen.current = false;
    }
  }, [open]);
  const current = navigation.find((item) => item.href === pathname);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          className="nav-overlay"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (open && e.key === "Tab") {
            const items = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>("a[href], button"),
            ).filter(
              (el) =>
                el.getClientRects().length &&
                getComputedStyle(el).visibility !== "hidden",
            );
            const first = items[0],
              last = items[items.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
        className={`sidebar ${open ? "is-open" : ""}`}
      >
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-icon">
            <Atom size={26} />
          </span>
          <span>
            <strong>QuantumScope</strong>
            <small>Quantum Simulation Platform</small>
          </span>
        </Link>
        <button
          ref={closeRef}
          className="mobile-close"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        >
          <X />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`nav-item ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
              {pathname === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <BackendStatus />
          <div className="sidebar-footer">
            <span>RESEARCH PREVIEW</span>
            <span>v0.8</span>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={open}>
        <div className="topbar">
          <div className="breadcrumb">
            <button
              onClick={() => setOpen(!open)}
              ref={menuRef}
              className="menu-button"
              aria-label="Open navigation"
              aria-expanded={open}
            >
              <Menu size={21} />
            </button>
            <PanelLeftClose size={16} className="desktop-icon" />
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{current?.label ?? "Page"}</strong>
          </div>
          <StatusBadge />
        </div>
        <main id="main">
          <HistoryNotice />
          {children}
        </main>
        <p className="project-scope">{projectScope}</p>
        <footer className="main-footer">
          <span>
            QuantumScope <span className="footer-divider">/</span> A qubit-level
            exploration platform
          </span>
          <span>Qiskit simulations · History stored in this browser</span>
        </footer>
      </div>
    </div>
  );
}
