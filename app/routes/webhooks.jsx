import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  const { topic, shop, session, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await prisma.session.deleteMany({ where: { shop } });
        await prisma.memberPriceSettings.deleteMany({ where: { shop } });
      }
      break;
    case "CUSTOMERS_CREATE":
      // Optionally handle new customer creation (e.g., auto-tag them)
      break;
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response(null, { status: 200 });
};
