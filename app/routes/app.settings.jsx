import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  TextField,
  Button,
  Select,
  Checkbox,
  Banner,
  FormLayout,
  Divider,
  Badge,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const settings = await prisma.memberPriceSettings.findUnique({
    where: { shop },
  });

  return json({ settings, shop });
};

export const action = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();

  const discountPercentage = parseFloat(formData.get("discountPercentage") || "10");
  const tagBased = formData.get("tagBased") === "true";
  const memberTag = (formData.get("memberTag") || "member").trim();
  const enabledForAll = formData.get("enabledForAll") === "true";

  if (
    isNaN(discountPercentage) ||
    discountPercentage < 0 ||
    discountPercentage > 100
  ) {
    return json(
      { error: "Discount percentage must be between 0 and 100." },
      { status: 400 }
    );
  }

  if (tagBased && !memberTag) {
    return json(
      { error: "Please specify a member tag." },
      { status: 400 }
    );
  }

  await prisma.memberPriceSettings.upsert({
    where: { shop },
    update: { discountPercentage, tagBased, memberTag, enabledForAll },
    create: { shop, discountPercentage, tagBased, memberTag, enabledForAll },
  });

  return json({ success: true });
};

export default function SettingsPage() {
  const { settings } = useLoaderData();
  const fetcher = useFetcher();

  const [discountPercentage, setDiscountPercentage] = useState(
    String(settings?.discountPercentage ?? 10)
  );
  const [tagBased, setTagBased] = useState(settings?.tagBased ?? false);
  const [memberTag, setMemberTag] = useState(settings?.memberTag ?? "member");
  const [enabledForAll, setEnabledForAll] = useState(
    settings?.enabledForAll ?? true
  );

  const handleSave = useCallback(() => {
    const formData = new FormData();
    formData.set("discountPercentage", discountPercentage);
    formData.set("tagBased", String(tagBased));
    formData.set("memberTag", memberTag);
    formData.set("enabledForAll", String(enabledForAll));
    fetcher.submit(formData, { method: "post" });
  }, [discountPercentage, tagBased, memberTag, enabledForAll, fetcher]);

  const isSaving = fetcher.state === "submitting";
  const saved = fetcher.state === "idle" && fetcher.data?.success;
  const error = fetcher.data?.error;

  return (
    <Page
      title="Settings"
      subtitle="Configure how member pricing works for your store."
      primaryAction={{
        content: "Save Settings",
        onAction: handleSave,
        loading: isSaving,
      }}
    >
      <BlockStack gap="500">
        {saved && (
          <Banner title="Settings saved successfully!" tone="success" />
        )}
        {error && (
          <Banner title="Error saving settings" tone="critical">
            <p>{error}</p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Member Discount
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  This global discount is automatically applied when a
                  qualifying customer logs in or creates an account. You can
                  override the price per-product on the Member Prices page.
                </Text>
                <FormLayout>
                  <TextField
                    label="Global Discount Percentage"
                    type="number"
                    value={discountPercentage}
                    onChange={setDiscountPercentage}
                    suffix="%"
                    min="0"
                    max="100"
                    helpText="Percentage discount applied to all products for members (e.g. 10 = 10% off)."
                    autoComplete="off"
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Who Qualifies as a Member?
                </Text>

                <Checkbox
                  label="Apply discount to all logged-in customers"
                  checked={enabledForAll}
                  onChange={setEnabledForAll}
                  helpText="Any customer who is logged in will receive the member price."
                />

                <Divider />

                <Checkbox
                  label="Require a specific customer tag"
                  checked={tagBased}
                  onChange={setTagBased}
                  helpText="Only customers with a specific tag will receive the member price."
                />

                {tagBased && (
                  <Box paddingInlineStart="600">
                    <TextField
                      label="Member Tag"
                      value={memberTag}
                      onChange={setMemberTag}
                      helpText='Tag your customers with this label in Shopify admin (e.g. "member", "vip", "wholesale").'
                      autoComplete="off"
                    />
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  How It Works
                </Text>
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Badge tone="info">Storefront</Badge>
                    <Text as="p" variant="bodyMd">
                      A theme widget shows the member price on product pages.
                      Non-logged-in visitors see a "Log in for member price"
                      prompt.
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Badge tone="info">Checkout</Badge>
                    <Text as="p" variant="bodyMd">
                      The Shopify Discount Function automatically applies the
                      correct member discount at checkout for qualifying
                      customers.
                    </Text>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Badge tone="info">Priority</Badge>
                    <Text as="p" variant="bodyMd">
                      Per-product member prices (set on the Member Prices page)
                      take priority over the global discount percentage.
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
