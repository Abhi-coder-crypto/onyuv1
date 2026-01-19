import { storage } from "./storage";

async function seed() {
  const products = [
    {
      name: "Shirt Full Sleeve Front",
      category: "Shirts",
      imageUrl: "/src/assets/shirt-full-sleeve-front.png"
    },
    {
      name: "Tshirt Full Sleeve Front",
      category: "T-Shirts",
      imageUrl: "/src/assets/tshirt-full-sleeve-front.png"
    }
  ];

  for (const product of products) {
    await storage.createProduct(product);
  }
  console.log("Seeding completed");
}

seed().catch(console.error);
