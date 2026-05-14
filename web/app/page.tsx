import App from "@/components/App";
import { loadAgentContentHtml } from "@/lib/content";

export default async function Home() {
  const [businessCaseHtml, courseHtml, teamHtml, faqHtml] = await Promise.all([
    loadAgentContentHtml("use-case.md"),
    loadAgentContentHtml("course.md"),
    loadAgentContentHtml("team.md"),
    loadAgentContentHtml("faq.md"),
  ]);

  return (
    <App
      businessCaseHtml={businessCaseHtml}
      courseHtml={courseHtml}
      teamHtml={teamHtml}
      faqHtml={faqHtml}
    />
  );
}
