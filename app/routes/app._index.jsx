import { json } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Button,
  Banner,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }) => {
  const { session, admin } = await authenticate.admin(request);
  const { shop } = session;

  // Get current settings
  const settings = await prisma.memberPriceSettings.findUnique({
    where: { shop },
  });

  // Fetch product count from Shopify
  const productCountResponse = await admin.graphql(`
    query {
      productsCount {
        count
      }
    }
  `);
  const productCountData = await productCountResponse.json();
  const productCount = productCountData?.data?.productsCount?.count ?? 0;

  // Fetch customer count
  const customerCountResponse = await admin.graphql(`
    query {
      customersCount {
        count
      }
    }
  `);
  const customerCountData = await customerCountResponse.json();
  const customerCount = customerCountData?.data?.customersCount?.count ?? 0;

  return json({
    shop,
    settings,
    productCount,
    customerCount,
  });
};

export default function Index() {
  const { shop, settings, productCount, customerCount } = useLoaderData();
  const navigate = useNavigate();

  return (
    <Page title="Member Price — Dashboard">
      <BlockStack gap="500">
        {!settings && (
          <Banner
            title="Welcome to Member Price!"
            action={{ content: "Configure Settings", url: "/app/settings" }}
            tone="info"
          >
            <p>
              Get started by configuring your member discount settings, then add
              member prices to your products.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Member Discount
                </Text>
                <Text as="p" variant="headingXl" fontWeight="bold">
                  {settings ? `${settings.discountPercentage}%` : "Not set"}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Applied to logged-in{" "}
                  {settings?.tagBased
                    ? `customers tagged "${settings.memberTag}"`
                    : "customers"}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Total Products
                </Text>
                <Text as="p" variant="headingXl" fontWeight="bold">
                  {productCount}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Products in your store
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Total Customers
                </Text>
                <Text as="p" variant="headingXl" fontWeight="bold">
                  {customerCount}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Registered customers
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How Member Pricing Works
                </Text>
                <BlockStack gap="300">
                  <InlineStack gap="200" align="start">
                    <Badge tone="success">Step 1</Badge>
                    <Text as="p" variant="bodyMd">
                      Configure your member discount percentage in{" "}
                      <a href="/app/settings">Settings</a>.
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="start">
                    <Badge tone="success">Step 2</Badge>
                    <Text as="p" variant="bodyMd">
                      Optionally set custom member prices per product in{" "}
                      <a href="/app/products">Member Prices</a>.
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="start">
                    <Badge tone="success">Step 3</Badge>
                    <Text as="p" variant="bodyMd">
                      When a customer logs in or creates an account, they
                      automatically see and receive discounted member prices at
                      checkout.
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200" align="start">
                    <Badge tone="success">Step 4</Badge>
                    <Text as="p" variant="bodyMd">
                      Non-logged-in visitors see the regular price with a prompt
                      to log in for member pricing.
                    </Text>
                  </InlineStack>
                </BlockStack>
                <Box paddingBlockStart="300">
                  <InlineStack gap="300">
                    <Button variant="primary" url="/app/products">
                      Manage Member Prices
                    </Button>
                    <Button url="/app/settings">Configure Settings</Button>
                  </InlineStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
