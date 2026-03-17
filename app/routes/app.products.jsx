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
  Banner,
  DataTable,
  Thumbnail,
  Badge,
  Spinner,
  EmptyState,
  Box,
  Modal,
  FormLayout,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

const MEMBER_PRICE_METAFIELD_NAMESPACE = "member_price";
const MEMBER_PRICE_METAFIELD_KEY = "price";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const settings = await prisma.memberPriceSettings.findUnique({
    where: { shop },
  });

  // Fetch first 50 products with their member price metafields
  const response = await admin.graphql(`
    query GetProductsWithMemberPrices {
      products(first: 50) {
        edges {
          node {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            metafield(namespace: "${MEMBER_PRICE_METAFIELD_NAMESPACE}", key: "${MEMBER_PRICE_METAFIELD_KEY}") {
              id
              value
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const products = data?.data?.products?.edges?.map((e) => e.node) ?? [];

  return json({ products, settings });
};

export const action = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const action = formData.get("_action");

  if (action === "set_member_price") {
    const productId = formData.get("productId");
    const memberPrice = formData.get("memberPrice");
    const metafieldId = formData.get("metafieldId") || null;

    if (!memberPrice || isNaN(parseFloat(memberPrice))) {
      return json({ error: "Invalid member price" }, { status: 400 });
    }

    const mutation = metafieldId
      ? `
        mutation UpdateMetafield($id: ID!, $value: String!) {
          metafieldUpdate(input: { id: $id, value: $value }) {
            metafield { id value }
            userErrors { field message }
          }
        }
      `
      : `
        mutation SetMetafield($productId: ID!, $namespace: String!, $key: String!, $value: String!, $type: String!) {
          productUpdate(input: {
            id: $productId
            metafields: [{
              namespace: $namespace
              key: $key
              value: $value
              type: $type
            }]
          }) {
            product {
              id
              metafield(namespace: "${MEMBER_PRICE_METAFIELD_NAMESPACE}", key: "${MEMBER_PRICE_METAFIELD_KEY}") {
                id value
              }
            }
            userErrors { field message }
          }
        }
      `;

    const variables = metafieldId
      ? { id: metafieldId, value: parseFloat(memberPrice).toFixed(2) }
      : {
          productId,
          namespace: MEMBER_PRICE_METAFIELD_NAMESPACE,
          key: MEMBER_PRICE_METAFIELD_KEY,
          value: parseFloat(memberPrice).toFixed(2),
          type: "money",
        };

    const response = await admin.graphql(mutation, { variables });
    const data = await response.json();
    const errors = data?.data?.metafieldUpdate?.userErrors ||
      data?.data?.productUpdate?.userErrors || [];

    if (errors.length > 0) {
      return json({ error: errors[0].message }, { status: 400 });
    }

    return json({ success: true });
  }

  if (action === "remove_member_price") {
    const metafieldId = formData.get("metafieldId");
    if (metafieldId) {
      const response = await admin.graphql(`
        mutation DeleteMetafield($id: ID!) {
          metafieldDelete(input: { id: $id }) {
            deletedId
            userErrors { field message }
          }
        }
      `, { variables: { id: metafieldId } });
      const data = await response.json();
      const errors = data?.data?.metafieldDelete?.userErrors || [];
      if (errors.length > 0) {
        return json({ error: errors[0].message }, { status: 400 });
      }
    }
    return json({ success: true });
  }

  return json({ error: "Unknown action" }, { status: 400 });
};

export default function ProductsPage() {
  const { products, settings } = useLoaderData();
  const fetcher = useFetcher();
  const [editingProduct, setEditingProduct] = useState(null);
  const [memberPrice, setMemberPrice] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const handleEdit = useCallback((product) => {
    setEditingProduct(product);
    setMemberPrice(product.metafield?.value || "");
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!editingProduct) return;
    const formData = new FormData();
    formData.set("_action", "set_member_price");
    formData.set("productId", editingProduct.id);
    formData.set("memberPrice", memberPrice);
    if (editingProduct.metafield?.id) {
      formData.set("metafieldId", editingProduct.metafield.id);
    }
    fetcher.submit(formData, { method: "post" });
    setModalOpen(false);
    setEditingProduct(null);
  }, [editingProduct, memberPrice, fetcher]);

  const handleRemove = useCallback((product) => {
    if (!product.metafield?.id) return;
    const formData = new FormData();
    formData.set("_action", "remove_member_price");
    formData.set("metafieldId", product.metafield.id);
    fetcher.submit(formData, { method: "post" });
  }, [fetcher]);

  const rows = products.map((product) => {
    const regularPrice = product.priceRangeV2?.minVariantPrice;
    const memberPriceValue = product.metafield?.value;
    const currencyCode = regularPrice?.currencyCode || "USD";
    const discountPercent = settings?.discountPercentage || 10;
    const calculatedMemberPrice = regularPrice
      ? (parseFloat(regularPrice.amount) * (1 - discountPercent / 100)).toFixed(2)
      : null;

    return [
      <InlineStack gap="200" key={product.id} blockAlign="center">
        {product.featuredImage ? (
          <Thumbnail
            source={product.featuredImage.url}
            alt={product.featuredImage.altText || product.title}
            size="small"
          />
        ) : (
          <Thumbnail source="" alt={product.title} size="small" />
        )}
        <Text as="span" variant="bodyMd">
          {product.title}
        </Text>
      </InlineStack>,
      regularPrice
        ? `${currencyCode} ${parseFloat(regularPrice.amount).toFixed(2)}`
        : "—",
      memberPriceValue ? (
        <Badge tone="success">{`${currencyCode} ${parseFloat(memberPriceValue).toFixed(2)}`}</Badge>
      ) : calculatedMemberPrice ? (
        <Badge tone="info">{`${currencyCode} ${calculatedMemberPrice} (auto)`}</Badge>
      ) : (
        "—"
      ),
      <InlineStack gap="200" key={`actions-${product.id}`}>
        <Button size="slim" onClick={() => handleEdit(product)}>
          {memberPriceValue ? "Edit" : "Set Price"}
        </Button>
        {memberPriceValue && (
          <Button
            size="slim"
            tone="critical"
            onClick={() => handleRemove(product)}
          >
            Remove
          </Button>
        )}
      </InlineStack>,
    ];
  });

  return (
    <Page
      title="Member Prices"
      subtitle="Set custom member prices per product, or rely on the global discount from Settings."
    >
      <BlockStack gap="500">
        {!settings && (
          <Banner
            title="Configure your global member discount first"
            action={{ content: "Go to Settings", url: "/app/settings" }}
            tone="warning"
          >
            <p>
              Set a global discount percentage in Settings. You can also
              override with per-product member prices here.
            </p>
          </Banner>
        )}

        <Layout>
          <Layout.Section>
            <Card padding="0">
              {products.length === 0 ? (
                <EmptyState
                  heading="No products found"
                  image=""
                >
                  <p>Add products to your Shopify store to manage member prices.</p>
                </EmptyState>
              ) : (
                <DataTable
                  columnContentTypes={["text", "text", "text", "text"]}
                  headings={[
                    "Product",
                    "Regular Price",
                    "Member Price",
                    "Actions",
                  ]}
                  rows={rows}
                />
              )}
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Set Member Price — ${editingProduct?.title || ""}`}
        primaryAction={{
          content: "Save",
          onAction: handleSave,
          loading: fetcher.state === "submitting",
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setModalOpen(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            <TextField
              label="Member Price"
              type="number"
              value={memberPrice}
              onChange={setMemberPrice}
              prefix={
                editingProduct?.priceRangeV2?.minVariantPrice?.currencyCode ||
                "USD"
              }
              placeholder="0.00"
              helpText="Leave blank to use the global discount percentage instead."
              autoComplete="off"
            />
            {editingProduct?.priceRangeV2?.minVariantPrice && settings && (
              <Text as="p" variant="bodyMd" tone="subdued">
                Regular price:{" "}
                {editingProduct.priceRangeV2.minVariantPrice.currencyCode}{" "}
                {parseFloat(
                  editingProduct.priceRangeV2.minVariantPrice.amount
                ).toFixed(2)}
                {" → "}
                Auto member price:{" "}
                {(
                  parseFloat(
                    editingProduct.priceRangeV2.minVariantPrice.amount
                  ) *
                  (1 - settings.discountPercentage / 100)
                ).toFixed(2)}
              </Text>
            )}
          </FormLayout>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
