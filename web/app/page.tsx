import App from "@/components/App";
import { loadAgentContentHtml } from "@/lib/content";

export default async function Home() {
  const businessCaseHtml = await loadAgentContentHtml("use-case.md");
  return <App businessCaseHtml={businessCaseHtml} />;
}
