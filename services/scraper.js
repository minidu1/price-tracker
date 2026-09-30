import "dotenv/config";
import puppeteer from "puppeteer";

export async function scrapePrice(url) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH,
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".pdp-price_type_normal", { timeout: 10000 });
  const priceText = await page.$eval(
    ".pdp-price_type_normal",
    (el) => el.textContent,
  );
  await browser.close(); //close the browser
  const numericPrice = parseFloat(
    priceText.match(/\d+(?:,\d{3})*(?:\.\d+)?/)?.[0].replace(/,/g, ""),
  );
  return numericPrice;
}
