import "dotenv/config";
import puppeteer from "puppeteer";

//run the puputeer browser
export async function launchBrowser() {
  try {
    const options = {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    };

    if (process.env.CHROME_PATH) {
      options.executablePath = process.env.CHROME_PATH;
    }
    return await puppeteer.launch(options);
  } catch (error) {
    throw new Error("Failed to launch browser", {
      cause: error,
    });
  }
}

export async function openNewWebPage(browser, url) {
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    return page;
  } catch (error) {
    throw new Error("Faild to open the page", { cause: error });
  }
}

// Assumes 'page' has already been navigated to the target URL via openNewWebPage().
export async function scrapeData(page) {
  try {
    const name = await scrapeProductName(page);
    const description = await scrapeProductDescription(page);
    const imgUrl = await scrapeProductImgUrl(page);

    return { name, description, imgUrl }; // return scraped data
  } catch (error) {
    console.error("scrape failed", error);
    return {
      name: null,
      description: [],
      imgUrl: null,
      error: true,
    };
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
  await page.waitForSelector(".pdp-mod-product-badge-title", {
    timeout: 10000,
  });
  const nameText = await page.$eval(
    ".pdp-mod-product-badge-title",
    (el) => el.textContent,
  );

  return nameText;
}

async function scrapeProductDescription(page) {
  try {
    //find script that contains "highlights" word
    const script = await page.evaluate(() => {
      return [...document.scripts]
        .map((script) => script.textContent)
        .find((text) => text.includes('"highlights"'));
    });

    const match = script.match(/"highlights":"(.*?)","/);

    const highlights = match[1];

    const description = await page.evaluate((html) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      return [...doc.querySelectorAll("li")].map((li) =>
        li.textContent.replace(/\\n/g, "").trim(),
      );
    }, highlights);

    return description;
  } catch (error) {
    console.error("Description scrape failed:", error);
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
      "img.pdp-mod-common-image.gallery-preview-panel__image",
      (el) => el.getAttribute("src"),
    );

    return imgUrl;
  } catch (error) {
    console.error("Image scrape failed:", error);
    return null; // for DB and UI
  }
}
