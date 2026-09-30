import "dotenv/config";
import { prisma } from "../prisma.js";
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNotification(email, productName, price, target) {
  const { error } = await resend.emails.send({
    from: "onboarding@resend.dev", // Resend's default test sender, works without domain verification
    to: email,
    subject: `Price drop: ${productName}`,
    text: `${productName} dropped to ${price}, at or below your target of ${target}!`,
  });

  if (error) {
    console.log(`Failed to send email to ${email}:`, error.message);
    return false;
  }
  return true;
}

export async function updateNotifiedInDatabase(emailSend, targetId) {
  if (emailSend) {
    await prisma.trackedProduct.update({
      where: { id: targetId },
      data: { notified: true },
    });
    console.log("notified");
    return true;
  } else {
    console.log("not sended");
    return false;
  }
}
