import Link from "next/link";
import { useRouter } from "next/router";

export default function Layout({ children, branding }) {
  const router = useRouter();
  const path = router.pathname;

  const navItems = [
    { href: "/", label: "미팅 목록" },
    { href: "/meetings/new", label: "미팅 신청" },
  ];

  return (
    <>
      <header className="header">
        <h1>{branding?.exhibitionName || "Exhibition Meeting"}</h1>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={path === item.href ? "active" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="container">
        <main className="page">{children}</main>
      </div>
    </>
  );
}
