import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { login } from "../shopify.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  if (url.searchParams.get("shop")) {
    throw redirect(`/auth?${url.searchParams.toString()}`);
  }
  return json({ showForm: Boolean(login) });
};

export default function App() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Shopify Member Price App</h1>
      <p>Please install this app from the Shopify App Store.</p>
    </div>
  );
}
