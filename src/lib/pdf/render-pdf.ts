import { execSync } from "child_process";

/**
 * Shared Puppeteer PDF renderer used by both the download and email routes.
 *
 * Browser resolution order:
 * 1. CHROMIUM_EXECUTABLE_PATH env var (explicit override — use on Hostinger/VPS)
 * 2. @sparticuz/chromium (AWS Lambda / serverless)
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
  ];

  let args: string[] = defaultArgs;
  let executablePath: string;

  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    // 1. Explicit env var — highest priority (Hostinger / VPS / custom setups)
    executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  } else if (process.env.NODE_ENV === "production") {
    // 2. Try @sparticuz/chromium for Lambda, fall back to system browser
    try {
      const chromium = (await import("@sparticuz/chromium")).default;
      args = chromium.args;
      executablePath = await chromium.executablePath();
    } catch {
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
  } else {
    // 3. Local development
    if (process.platform === "darwin") {
      executablePath =
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else {
      const systemBrowser = findSystemBrowser();
      executablePath =
        systemBrowser || "/usr/bin/google-chrome";
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
