import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

/**
 * Shared Puppeteer PDF renderer used by both the download and email routes.
 * Launches a single browser instance per call to avoid resource issues.
 */
export async function renderHtmlToPdf(
  html: string,
  landscape: boolean
): Promise<Buffer> {
  const isProduction = process.env.NODE_ENV === "production";

  const browser = await puppeteer.launch({
    args: isProduction
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
    executablePath: isProduction
      ? await chromium.executablePath()
      : process.platform === "darwin"
        ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        : "/usr/bin/google-chrome",
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
