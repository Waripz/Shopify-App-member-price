import { json } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  const errors = login(request);
  return json({ errors: await errors });
};

export default function Auth() {
  return null;
}
