import type { Metadata } from "next";
import { ABOUT, NOTICES } from "../../../_components/about";
import { isLocale, type Locale, localeAlternates } from "../../../_components/chrome";

/**
 * PRD 24.1 lists the product and tool pages that may be indexed; this colophon is neither, so it
 * stays out of the sitemap while still declaring its own canonical and its hreflang siblings.
 * If the owner wants it in the sitemap, §24.1 is the clause to amend first.
 */
const PATH = "/about";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  return {
    title: ABOUT[key].title,
    description: ABOUT[key].description,
    alternates: localeAlternates(key, PATH),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const key = (isLocale(locale) ? locale : "ru") as Locale;
  const about = ABOUT[key];

  return (
    <>
      <h1>{about.title}</h1>
      <p className="lede">{about.description}</p>

      {about.sections.map((section) => (
        <section className="section prose" key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </section>
      ))}

      <section className="section prose">
        <h2>{about.noticesHeading}</h2>
        <p>{about.noticesIntro}</p>
        <div className="table-scroll">
          <table>
            <tbody>
              {NOTICES.map((notice) => (
                <tr key={notice.name}>
                  <td>
                    <a href={notice.href} rel="noopener noreferrer" target="_blank">
                      {notice.name}
                    </a>
                  </td>
                  <td className="mono">{notice.licence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="hint">{about.updated}</p>
    </>
  );
}
