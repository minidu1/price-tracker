import { prisma } from "../prismaClient.js";
import { scrapeData } from "../services/scraper.js";

export async function ensureProductExist(link, page) {
  const existing = await prisma.product.findUnique({
    where: { link },
  });

  if (existing) return true;

  const scraped = await scrapeData(page);
  if (scraped.error) {
    throw new Error("SCRAPE_FAILED");
  }
  const { name, description, imgUrl } = scraped;

  try {
    await prisma.product.create({
      data: {
        link,
        name,
        description,
        picture: imgUrl,
      },
    });
    
    return true
  } catch (error) {
    if (error.code === "P2002") {
      return true
    }
    throw error;
  }
}
