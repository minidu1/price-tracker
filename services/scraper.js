import "dotenv/config";
import puppeteer from "puppeteer";

//run the puputeer browser
export async function launchBrowser() {
  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      // executablePath: CHROME_PATH,
    });
    return browser;
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
    return { page, browser };
  } catch (error) {
    throw new Error("Faild to open the page", { cause: error });
  }
}

// Assumes `page` has already been navigated to the target URL via openNewWebPage().
// Calling this on a page that hasn't navigated yet will return empty/null fields.
export async function scrapeData(page) {
  try {
    const name = await scrapeProductName(page);
    const description = await scrapeProductDescription(page);
    const imgUrl = await scrapeProductImgUrl(page);

    return { name, description, imgUrl }; // return scraped data
  } catch (error) {
    console.log("scrape failed", error);
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
      const doc = parser.parseFromString(html, "text/html"); //parse that string into html

      return [...doc.querySelectorAll("li")].map((li) =>
        li.textContent.replace(/\\n/g, "").trim(),
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

//testing
// const CHROME_PATH =
//   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
// const url =
//   "https://www.daraz.lk/products/black-knight-original-vap-spray-50ml-i121505490-s1037809577.html?spm=a2a0e.tm80335410.2084424680.22&&scm=1007.51610.379274.0&pvid=28dbfaa7-7ace-4582-b268-b8ab93f20d6f&search=flashsale?search=1&mp=1&c=fs&clickTrackInfo=rs%3A0.36%3Bfs_item_discount_price%3A612%3Bitem_id%3A121505490%3Bpctr%3A0.0%3Bcalib_pctr%3A0.0%3Bvoucher_price%3A612%3Bmt%3Ahot%3Bpromo_price%3A612%3Bfs_utdid%3A-1%3Bfs_item_sold_cnt%3A6%3Babid%3A379274%3Bfs_item_price%3A850%3Bpvid%3A28dbfaa7-7ace-4582-b268-b8ab93f20d6f%3Bfs_min_price_l30d%3A0%3Bdata_type%3Aflashsale%3Bfs_pvid%3A28dbfaa7-7ace-4582-b268-b8ab93f20d6f%3Btime%3A1791041192%3Bfs_biz_type%3Afs%3Bscm%3A1007.51610.379274.%3Bchannel_id%3A0000%3Bfs_item_discount%3A28%25%3Bcampaign_id%3A400848&scm=1007.51610.379274.0";
// const test = await scrapeData(url);
// console.log(test);
