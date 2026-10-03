import { prisma } from "../prismaClient.js";

export async function addToTrackedProduct(link, target, uid) {
  const product = await prisma.trackedProduct.create({
    data: {
      user: {
        connect: {
          id: uid,
        },
      },
      target,
      notified: false,
      product: {
        connect: {
          link,
        },
      },
    },
  });

  return product;
}
