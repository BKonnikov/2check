import { WEB_API_BASE_PATH } from "@2check/contracts";

export default function HomePage() {
  return (
    <main>
      <h1>2check.uz</h1>
      <p>Внутренний веб-API: {WEB_API_BASE_PATH}</p>
    </main>
  );
}
