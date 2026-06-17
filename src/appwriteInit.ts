import { OperationType } from "./appwrite";

interface InitParams {
  endpoint: string;
  projectId: string;
  apiKey: string;
  databaseId: string;
}

const COLLECTIONS_SCHEMA = [
  {
    id: "users",
    name: "User Profiles",
    attributes: [
      { key: "email", type: "string", size: 255, required: true },
      { key: "name", type: "string", size: 255, required: true },
      { key: "fullname", type: "string", size: 255, required: false },
      { key: "phoneNumber", type: "string", size: 255, required: false },
      { key: "phone", type: "string", size: 255, required: false },
      { key: "balance", type: "float", required: false, default: 0.0 },
      { key: "walletBalance", type: "float", required: false, default: 0.0 },
      { key: "totalInvested", type: "float", required: false, default: 0.0 },
      { key: "totalEarnings", type: "float", required: false, default: 0.0 },
      { key: "referralBonus", type: "float", required: false, default: 0.0 },
      { key: "totalProfit", type: "float", required: false, default: 0.0 },
      { key: "referralCode", type: "string", size: 100, required: true },
      { key: "referredBy", type: "string", size: 100, required: false },
      { key: "isAdmin", type: "boolean", required: false, default: false },
      { key: "registeredAt", type: "string", size: 100, required: false },
      { key: "createdAt", type: "string", size: 100, required: false },
      { key: "isBanned", type: "boolean", required: false, default: false }
    ]
  },
  {
    id: "investmentPlans",
    name: "Investment Plans",
    attributes: [
      { key: "name", type: "string", size: 255, required: true },
      { key: "title", type: "string", size: 255, required: false },
      { key: "type", type: "string", size: 50, required: true },
      { key: "category", type: "string", size: 50, required: false },
      { key: "minAmount", type: "float", required: true },
      { key: "maxAmount", type: "float", required: true },
      { key: "amount", type: "float", required: false },
      { key: "profitPercent", type: "float", required: true },
      { key: "durationDays", type: "integer", required: true },
      { key: "duration", type: "integer", required: false },
      { key: "dailyProfit", type: "float", required: false },
      { key: "totalReturn", type: "float", required: false },
      { key: "imageUrl", type: "string", size: 1000, required: false },
      { key: "image", type: "string", size: 1000, required: false },
      { key: "description", type: "string", size: 2000, required: false },
      { key: "status", type: "string", size: 50, required: false, default: "active" }
    ]
  },
  {
    id: "deposits",
    name: "User Deposits",
    attributes: [
      { key: "userId", type: "string", size: 100, required: true },
      { key: "amount", type: "float", required: true },
      { key: "status", type: "string", size: 50, required: true, default: "pending" },
      { key: "txRef", type: "string", size: 255, required: true },
      { key: "proofImg", type: "string", size: 1000, required: false },
      { key: "receiptImage", type: "string", size: 1000, required: false },
      { key: "createdAt", type: "string", size: 100, required: true }
    ]
  },
  {
    id: "investments",
    name: "Active Investments",
    attributes: [
      { key: "userId", type: "string", size: 100, required: true },
      { key: "planId", type: "string", size: 100, required: true },
      { key: "planName", type: "string", size: 255, required: true },
      { key: "type", type: "string", size: 50, required: true },
      { key: "amount", type: "float", required: true },
      { key: "profitRate", type: "float", required: true },
      { key: "expectedReturn", type: "float", required: true },
      { key: "dailyProfit", type: "float", required: false },
      { key: "durationDays", type: "integer", required: true },
      { key: "startDate", type: "string", size: 100, required: false },
      { key: "endDate", type: "string", size: 100, required: false },
      { key: "status", type: "string", size: 50, required: true, default: "active" },
      { key: "createdAt", type: "string", size: 100, required: true },
      { key: "maturesAt", type: "string", size: 100, required: true }
    ]
  },
  {
    id: "withdrawals",
    name: "User Withdrawals",
    attributes: [
      { key: "userId", type: "string", size: 100, required: true },
      { key: "amount", type: "float", required: true },
      { key: "status", type: "string", size: 50, required: true, default: "pending" },
      { key: "accountDetails", type: "string", size: 1000, required: true },
      { key: "createdAt", type: "string", size: 100, required: true }
    ]
  },
  {
    id: "notifications",
    name: "User Notifications",
    attributes: [
      { key: "userId", type: "string", size: 100, required: true },
      { key: "title", type: "string", size: 255, required: true },
      { key: "message", type: "string", size: 2000, required: true },
      { key: "isRead", type: "boolean", required: true, default: false },
      { key: "createdAt", type: "string", size: 100, required: true }
    ]
  },
  {
    id: "farmUpdates",
    name: "Farm News Updates",
    attributes: [
      { key: "title", type: "string", size: 255, required: true },
      { key: "content", type: "string", size: 3000, required: true },
      { key: "description", type: "string", size: 3000, required: false },
      { key: "imageUrl", type: "string", size: 1000, required: false },
      { key: "image", type: "string", size: 1000, required: false },
      { key: "videoUrl", type: "string", size: 1000, required: false },
      { key: "video", type: "string", size: 1000, required: false },
      { key: "type", type: "string", size: 50, required: true },
      { key: "createdAt", type: "string", size: 100, required: true }
    ]
  },
  {
    id: "referrals",
    name: "Referrals Records",
    attributes: [
      { key: "referrerId", type: "string", size: 100, required: true },
      { key: "referrerCode", type: "string", size: 100, required: true },
      { key: "referredId", type: "string", size: 100, required: true },
      { key: "referredName", type: "string", size: 255, required: true },
      { key: "referredEmail", type: "string", size: 255, required: true },
      { key: "referredPhone", type: "string", size: 100, required: false },
      { key: "status", type: "string", size: 50, required: true, default: "pending" },
      { key: "commissionPaid", type: "float", required: false, default: 0.0 },
      { key: "createdAt", type: "string", size: 100, required: true }
    ]
  }
];

const SEED_PLANS = [
  {
    id: "plan-chicken-starter",
    name: "Starter Chicken",
    type: "Chicken",
    minAmount: 3000,
    maxAmount: 3000,
    profitPercent: 100,
    durationDays: 14,
    imageUrl: "https://images.unsplash.com/photo-1548550123-94f1067bc16f?w=600&auto=format&fit=crop&q=80",
    description: "Ideal entry-level organic poultry program. Sponsor a broiler batch and receive daily yields.",
    status: "active"
  },
  {
    id: "plan-chicken-layers",
    name: "Premium Poultry Batch",
    type: "Chicken",
    minAmount: 10000,
    maxAmount: 10000,
    profitPercent: 150,
    durationDays: 30,
    imageUrl: "https://images.unsplash.com/photo-1612170153139-6f881ff067e0?w=600&auto=format&fit=crop&q=80",
    description: "High-yield commercial egg production with climate-controlled automated layer housing systems.",
    status: "active"
  },
  {
    id: "plan-chicken-commercial",
    name: "Commercial Egg Hatchery",
    type: "Chicken",
    minAmount: 50000,
    maxAmount: 50000,
    profitPercent: 225,
    durationDays: 45,
    imageUrl: "https://images.unsplash.com/photo-1598902108854-10e335adac99?w=600&auto=format&fit=crop&q=80",
    description: "Large scale layers flock distribution serving high volume wholesale consumer networks.",
    status: "active"
  },
  {
    id: "plan-pig-starter",
    name: "Starter Piglet",
    type: "Pig",
    minAmount: 15000,
    maxAmount: 15000,
    profitPercent: 168,
    durationDays: 21,
    imageUrl: "https://images.unsplash.com/photo-1604848698030-c434ba08eca1?w=600&auto=format&fit=crop&q=80",
    description: "Support premium bio-secure unit growing high performance piglets with optimal nutrition ratios.",
    status: "active"
  },
  {
    id: "plan-pig-breeding",
    name: "Berkshire Breeding Unit",
    type: "Pig",
    minAmount: 40000,
    maxAmount: 40000,
    profitPercent: 450,
    durationDays: 60,
    imageUrl: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&auto=format&fit=crop&q=80",
    description: "Sponsor pedigree Berkshire pig unit breeding program delivering elite stocks to meat producers.",
    status: "active"
  },
  {
    id: "plan-pig-export",
    name: "Elite Pork-Export",
    type: "Pig",
    minAmount: 120000,
    maxAmount: 120000,
    profitPercent: 750,
    durationDays: 90,
    imageUrl: "https://images.unsplash.com/photo-1551884831-b5901dc0f7a4?w=600&auto=format&fit=crop&q=80",
    description: "Fully-managed commercial scale export strategy with guaranteed cold-chain logistic fulfillment.",
    status: "active"
  }
];

const SEED_UPDATES = [
  {
    id: "update-1",
    title: "Eco-Friendly Feed Silos Completed",
    content: "We have fully installed four modern digital moisture grain silos. This preserves premium high-protein chicken feeds, optimizing poultry growth by 12%.",
    imageUrl: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&auto=format&fit=crop&q=80",
    type: "Chicken",
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "update-2",
    title: "Pig breeding bio-sensors installed",
    content: "Our breeding centers just received real-time health and environmental tags, raising gestation safety metrics by 15%.",
    imageUrl: "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=600&auto=format&fit=crop&q=80",
    type: "Pig",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export async function initializeAppwriteInfra(params: InitParams): Promise<{ success: boolean; logs: string[] }> {
  const logs: string[] = [];
  const addLog = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  const headers = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": params.projectId,
    "X-Appwrite-Key": params.apiKey
  };

  const cleanEndpoint = params.endpoint.endsWith("/") ? params.endpoint.slice(0, -1) : params.endpoint;

  try {
    addLog(`Starting Appwrite initialization at end-point: ${cleanEndpoint}`);

    // Step 1: Create Database
    addLog(`Creating database: "${params.databaseId}"...`);
    const dbRes = await fetch(`${cleanEndpoint}/databases`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        databaseId: params.databaseId,
        name: "Sovereign Farms Database"
      })
    });

    if (dbRes.status === 409) {
      addLog(`Database "${params.databaseId}" already exists. Proceeding.`);
    } else if (!dbRes.ok) {
      const errorText = await dbRes.text();
      addLog(`Database creation result: ${dbRes.status} ${dbRes.statusText} - ${errorText}`);
    } else {
      addLog(`Database "${params.databaseId}" created successfully!`);
    }

    // Step 2: Create Collections and Attributes
    for (const schema of COLLECTIONS_SCHEMA) {
      addLog(`-----------------------------------------`);
      addLog(`Setting up collection: "${schema.id}" (${schema.name})`);

      const colRes = await fetch(`${cleanEndpoint}/databases/${params.databaseId}/collections`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          collectionId: schema.id,
          name: schema.name,
          permissions: [
            "read(\"any\")",
            "create(\"any\")",
            "update(\"any\")",
            "delete(\"any\")"
          ]
        })
      });

      if (colRes.status === 409) {
        addLog(`Collection "${schema.id}" already exists. Force updating permissions to ensure standard roles are granted...`);
        const updateRes = await fetch(`${cleanEndpoint}/databases/${params.databaseId}/collections/${schema.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            name: schema.name,
            permissions: [
              "read(\"any\")",
              "create(\"any\")",
              "update(\"any\")",
              "delete(\"any\")"
            ],
            documentSecurity: false
          })
        });
        if (updateRes.ok) {
          addLog(`Collection "${schema.id}" permissions/roles updated successfully!`);
        } else {
          const updateText = await updateRes.text();
          addLog(`Warning: Failed to update roles for "${schema.id}": ${updateRes.status} - ${updateText}`);
        }
      } else if (!colRes.ok) {
        const errorText = await colRes.text();
        addLog(`Collection build error: ${colRes.status} - ${errorText}`);
      } else {
        addLog(`Collection "${schema.id}" successfully deployed!`);
      }

      // Attributes creations
      for (const attr of schema.attributes) {
        addLog(`Deploying attribute [${attr.key}] type [${attr.type}] for ${schema.id}...`);
        
        let pathName = "";
        let payload: any = {
          key: attr.key,
          required: attr.required,
          default: attr.default !== undefined ? attr.default : null
        };

        if (attr.type === "string") {
          pathName = "string";
          payload.size = attr.size || 255;
        } else if (attr.type === "integer") {
          pathName = "integer";
          payload.min = 0;
          payload.max = 9999999;
        } else if (attr.type === "float") {
          pathName = "float";
          payload.min = 0.0;
          payload.max = 9999999.0;
        } else if (attr.type === "boolean") {
          pathName = "boolean";
        }

        const attrRes = await fetch(
          `${cleanEndpoint}/databases/${params.databaseId}/collections/${schema.id}/attributes/${pathName}`,
          {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          }
        );

        if (attrRes.status === 409) {
          addLog(`Attribute "${attr.key}" already exists on collection "${schema.id}". Skip.`);
        } else if (!attrRes.ok) {
          const text = await attrRes.text();
          addLog(`Attribute setup status: ${attrRes.status} Info: ${text}`);
        } else {
          addLog(`Attribute "${attr.key}" created.`);
        }
      }

      // Wait a short duration to let Appwrite indices catch up
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog(`-----------------------------------------`);
    addLog(`Collections and Columns successfully constructed! seeding default configurations...`);

    // Step 3: Seed Dynamic Plans
    for (const plan of SEED_PLANS) {
      addLog(`Seeding project plan: ${plan.name}...`);
      const seedRes = await fetch(
        `${cleanEndpoint}/databases/${params.databaseId}/collections/investmentPlans/documents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            documentId: plan.id,
            data: {
              name: plan.name,
              title: plan.name,
              type: plan.type,
              category: plan.type,
              minAmount: plan.minAmount,
              maxAmount: plan.maxAmount,
              amount: plan.minAmount,
              profitPercent: plan.profitPercent,
              durationDays: plan.durationDays,
              duration: plan.durationDays,
              dailyProfit: (plan.minAmount * (plan.profitPercent / 100)) / plan.durationDays,
              totalReturn: plan.minAmount * (1 + plan.profitPercent / 100),
              imageUrl: plan.imageUrl,
              image: plan.imageUrl,
              description: plan.description,
              status: plan.status
            }
          })
        }
      );

      if (seedRes.status === 409) {
        addLog(`Plan "${plan.id}" already seeded. Skip.`);
      } else if (!seedRes.ok) {
        const text = await seedRes.text();
        addLog(`Plan seeding result: ${seedRes.status} Error: ${text}`);
      } else {
        addLog(`Plan "${plan.name}" successfully active.`);
      }
    }

    // Step 4: Seed Farm updates news
    for (const update of SEED_UPDATES) {
      addLog(`Seeding farm update: ${update.title}...`);
      const seedRes = await fetch(
        `${cleanEndpoint}/databases/${params.databaseId}/collections/farmUpdates/documents`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            documentId: update.id,
            data: {
              title: update.title,
              content: update.content,
              description: update.content,
              imageUrl: update.imageUrl,
              image: update.imageUrl,
              videoUrl: "",
              video: "",
              type: update.type,
              createdAt: update.createdAt
            }
          })
        }
      );

      if (seedRes.status === 409) {
        addLog(`Update "${update.id}" already exists. Skip.`);
      } else if (!seedRes.ok) {
        const text = await seedRes.text();
        addLog(`Update seeding result: ${seedRes.status} Error: ${text}`);
      } else {
        addLog(`Update "${update.title}" successfully seeded.`);
      }
    }

    addLog(`Appwrite database infrastructure has been successfully initialized and populated!`);
    return { success: true, logs };

  } catch (err: any) {
    addLog(`Critical crash during Appwrite config: ${err.message || String(err)}`);
    return { success: false, logs };
  }
}
