import "@/styles/globals.css";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { applyTheme } from "@/lib/theme";
import Layout from "@/components/Layout";

export default function App({ Component, pageProps }) {
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    api.getConfig().then((cfg) => {
      applyTheme(cfg.theme);
      setBranding(cfg.branding);
    }).catch(() => {});
  }, []);

  return (
    <Layout branding={branding}>
      <Component {...pageProps} branding={branding} />
    </Layout>
  );
}
