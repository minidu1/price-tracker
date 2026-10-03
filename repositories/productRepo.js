import { prisma } from "../prismaClient.js";
import { scrapeData } from "../services/scraper.js";

export async function createOrGetProduct(link) {
  const existing = await prisma.product.findUnique({
    where: { link },
  });

  if (existing) return existing;

  const { name, description, imgUrl } = await scrapeData(link);

  try {
    return await prisma.product.create({
      data: {
        link,
        name,
        description,
        picture: imgUrl,
      },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return prisma.product.findUnique({
        where: { link },
      });
    }

    throw error;
  }
}