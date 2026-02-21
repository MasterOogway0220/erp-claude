/**
 * Shared Puppeteer PDF renderer used by both the download and email routes.
 * Uses dynamic imports so chromium/puppeteer aren't loaded on cold start
 * for non-PDF routes, reducing memory usage and startup time.
 */
export async function renderHtmlToPdf(
  html: string,
  landscape: boolean
): Promise<Buffer> {
  const isProduction = process.env.NODE_ENV === "production";

  const puppeteer = (await import("puppeteer-core")).default;

  let args: string[];
  let executablePath: string;

  if (isProduction) {
    const chromium = (await import("@sparticuz/chromium")).default;
    args = chromium.args;
    executablePath = await chromium.executablePath();
  } else {
    args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"];
    executablePath =
      process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome";
  }

  const browser = await puppeteer.launch({
    args,
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      margin: landscape
        ? { top: "5mm", right: "5mm", bottom: "5mm", left: "5mm" }
        : { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
