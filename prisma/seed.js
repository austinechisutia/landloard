const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding house types...");

  await prisma.houseType.createMany({
    data: [
      { name: "Single",    rentAmount: 4000 },
      { name: "Bedsitter", rentAmount: 6500 },
      { name: "1 Bedroom", rentAmount: 12000 },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
