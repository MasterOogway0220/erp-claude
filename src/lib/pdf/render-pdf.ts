import puppeteer from "puppeteer";

/**
 * Shared Puppeteer PDF renderer used by both the download and email routes.
 * Launches a single browser instance per call to avoid resource issues.
 */
export async function renderHtmlToPdf(
  html: string,
  landscape: boolean
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
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
