import { execSync } from "child_process";

/**
 * Shared Puppeteer PDF renderer used by both the download and email routes.
 *
 * Browser resolution order:
 * 1. CHROMIUM_EXECUTABLE_PATH env var (explicit override — use on Hostinger/VPS)
 * 2. @sparticuz/chromium (Vercel / AWS Lambda / serverless)
 * 3. System-installed chromium or google-chrome (auto-detected)
 * 4. macOS Chrome (local dev)
 */

function findSystemBrowser(): string | null {
  const candidates = [
    "chromium-browser",
    "chromium",
    "google-chrome-stable",
    "google-chrome",
  ];
  for (const cmd of candidates) {
    try {
      const path = execSync(`which ${cmd}`, { encoding: "utf-8" }).trim();
      if (path) return path;
    } catch {
      // not found, try next
    }
  }
  return null;
}

export async function renderHtmlToPdf(
  html: string,
  landscape: boolean
): Promise<Buffer> {
  const puppeteer = (await import("puppeteer-core")).default;

  const defaultArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--single-process",
    "--font-render-hinting=none",
  ];

  let args: string[] = defaultArgs;
  let executablePath: string;

  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    // 1. Explicit env var — highest priority (Hostinger / VPS / custom setups)
    executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  } else {
    // 2. Try @sparticuz/chromium (works on Vercel, Lambda, and serverless)
    try {
      const chromium = (await import("@sparticuz/chromium")).default as any;
      if (typeof chromium.setHeadlessMode === "function") chromium.setHeadlessMode(true);
      if (typeof chromium.setGraphicsMode === "function") chromium.setGraphicsMode(false);
      args = chromium.args;
      executablePath = await chromium.executablePath();
    } catch {
      // 3. Fallback: system browser or macOS Chrome
      if (process.platform === "darwin") {
        executablePath =
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
      } else {
        const systemBrowser = findSystemBrowser();
        if (systemBrowser) {
          executablePath = systemBrowser;
        } else {
          throw new Error(
            "No browser found. Install chromium (apt-get install chromium-browser) " +
            "or set CHROMIUM_EXECUTABLE_PATH env var."
          );
        }
      }
    }
  }

  const browser = await puppeteer.launch({
    args,
    executablePath,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfOptions: any = {
      printBackground: true,
    };
    if (landscape) {
      // Custom wider page to fit all content on one page
      pdfOptions.width = "297mm";
      pdfOptions.height = "230mm";
      pdfOptions.margin = { top: "6mm", right: "8mm", bottom: "6mm", left: "8mm" };
    } else {
      pdfOptions.format = "A4";
      pdfOptions.margin = { top: "10mm", right: "8mm", bottom: "10mm", left: "8mm" };
    }
    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
