import "dotenv/config";
import puppeteer from "puppeteer";

//test data
const url =
  "https://www.daraz.lk/products/soundcore-r60i-nc-by-anker-wireless-earbuds-bluetooth-61-real-time-adaptive-anc-hi-res-sound-ai-translation-ip55-i1755368712-s12896105897.html?scm=1007.51610.379274.0&pvid=4cbebe76-3714-489e-8b7f-26b0e013d54d&search=flashsale&spm=a2a0e.tm80335410.FlashSale.d_1755368712";

export async function scrapeData(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      // executablePath: process.env.CHROME_PATH,
      executablePath:
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });

    const price = await scrapePrice(page);
    const name = await scrapeProductName(page);
    const description = await scrapeProductDescription(page);
    const imgUrl = await scrapeProductImgUrl(page);

    return { price, name, description, imgUrl }; // return scraped data
  } catch (error) {
    console.log("scrape failed",error);
    return {
      price: null,
      name: null,
      description: [],
      imgUrl: null,
      error: true,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapePrice(page) {
  await page.waitForSelector(".pdp-price_type_normal", { timeout: 10000 });
  const priceText = await page.$eval(
    ".pdp-price_type_normal",
    (el) => el.textContent,
  );
  const numericPrice = parseFloat(
    priceText.match(/\d+(?:,\d{3})*(?:\.\d+)?/)?.[0].replace(/,/g, ""),
  );
  return numericPrice;
}

async function scrapeProductName(page) {
  try {
    await page.waitForSelector(".pdp-mod-product-badge-title", {
      timeout: 10000,
    });
    const nameText = await page.$eval(
      ".pdp-mod-product-badge-title",
      (el) => el.textContent,
    );

    return nameText;
  } catch (error) {
    console.log("Name scrape failed", error);
    return "Unknown";
  }
}

async function scrapeProductDescription(page) {
  try {
    //find script that contains "highlight" word
    const script = await page.evaluate(() => {
      return [...document.scripts]
        .map((script) => script.textContent)
        .find((text) => text.includes('"highlights"'));
    });

    const match = script.match(/"highlights":"(.*?)","/);

    const highlights = match[1];

    const description = await page.evaluate((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html"); //parse that string into html

      return [...doc.querySelectorAll("li span")].map((span) =>
        span.textContent.replace(/\\n/g, "").trim(),
      );
    }, highlights);

    return description;
  } catch (error) {
    console.log("Description scrape failed:", error);
    return [];
  }
}

async function scrapeProductImgUrl(page) {
  try {
    await page.waitForSelector(
      ".gallery-preview-panel img.pdp-mod-common-image.gallery-preview-panel__image",
      {
        timeout: 10000,
      },
    );
    const imgUrl = await page.$eval(
      "img.pdp-mod-common-image.gallery-preview-panel__image", // there are two img tags in parent elem
      (el) => el.getAttribute("src"),
    );

    return imgUrl;
  } catch (error) {
    console.log("Image scrape failed:", error);
    return null; // for DB and UI
  }
}

const test = await scrapeData(url);
console.log(test);
