import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://blastcrates:blastcrates_secret@localhost:5432/blastcrates',
  entities: ['src/**/*.entity.ts'],
  synchronize: true,
});

const cases = [
  {
    name: 'Starter Blast',
    description: 'Perfect for beginners. Great value for money!',
    price: 500,
    category: 'starter',
    isActive: true,
    isFeatured: true,
    sortOrder: 1,
    items: [
      { name: 'Bronze Shield', rarity: 'common', value: 300, probability: 50 },
      { name: 'Iron Sword', rarity: 'common', value: 350, probability: 30 },
      { name: 'Silver Arrow', rarity: 'uncommon', value: 700, probability: 12 },
      { name: 'Gold Ring', rarity: 'uncommon', value: 900, probability: 5 },
      { name: 'Rare Crystal', rarity: 'rare', value: 2500, probability: 2.5 },
      { name: 'Epic Gem', rarity: 'epic', value: 5000, probability: 0.4 },
      { name: 'Legendary Artifact', rarity: 'legendary', value: 15000, probability: 0.1 },
    ],
  },
  {
    name: 'Premium Vault',
    description: 'Higher risk, higher reward. Premium items inside!',
    price: 2000,
    category: 'premium',
    isActive: true,
    isFeatured: true,
    sortOrder: 2,
    items: [
      { name: 'Steel Armor', rarity: 'uncommon', value: 1500, probability: 40 },
      { name: 'Enchanted Bow', rarity: 'uncommon', value: 1800, probability: 25 },
      { name: 'Crystal Dagger', rarity: 'rare', value: 4000, probability: 18 },
      { name: 'Magic Staff', rarity: 'rare', value: 5500, probability: 10 },
      { name: 'Dragon Scale', rarity: 'epic', value: 12000, probability: 5 },
      { name: 'Phoenix Feather', rarity: 'legendary', value: 35000, probability: 1.5 },
      { name: 'Void Shard', rarity: 'mythic', value: 100000, probability: 0.5 },
    ],
  },
  {
    name: 'Epic Arsenal',
    description: 'Only for the brave. Epic and above guaranteed!',
    price: 5000,
    category: 'epic',
    isActive: true,
    isFeatured: false,
    sortOrder: 3,
    items: [
      { name: 'War Hammer', rarity: 'rare', value: 4000, probability: 35 },
      { name: 'Shadow Cloak', rarity: 'rare', value: 5000, probability: 25 },
      { name: 'Storm Caller', rarity: 'epic', value: 15000, probability: 20 },
      { name: 'Celestial Bow', rarity: 'epic', value: 20000, probability: 12 },
      { name: 'Divine Sword', rarity: 'legendary', value: 60000, probability: 6 },
      { name: 'Cosmic Armor', rarity: 'legendary', value: 80000, probability: 1.5 },
      { name: 'Universe Key', rarity: 'mythic', value: 250000, probability: 0.5 },
    ],
  },
  {
    name: 'Legendary Chest',
    description: 'The ultimate collection. Legendary minimum!',
    price: 15000,
    category: 'legendary',
    isActive: true,
    isFeatured: true,
    sortOrder: 4,
    items: [
      { name: 'Titan Blade', rarity: 'legendary', value: 14000, probability: 50 },
      { name: 'Godly Shield', rarity: 'legendary', value: 18000, probability: 28 },
      { name: 'Eternal Flame', rarity: 'legendary', value: 25000, probability: 14 },
      { name: 'Soul Fragment', rarity: 'mythic', value: 75000, probability: 5 },
      { name: 'Time Crystal', rarity: 'mythic', value: 120000, probability: 2.5 },
      { name: 'Infinity Stone', rarity: 'mythic', value: 500000, probability: 0.5 },
    ],
  },
  {
    name: 'Holiday Special',
    description: 'Limited time event case! Exclusive items inside.',
    price: 1000,
    category: 'event',
    isActive: true,
    isFeatured: true,
    sortOrder: 5,
    items: [
      { name: 'Holiday Hat', rarity: 'common', value: 700, probability: 40 },
      { name: 'Snow Globe', rarity: 'uncommon', value: 1200, probability: 30 },
      { name: 'Festive Wreath', rarity: 'rare', value: 3000, probability: 18 },
      { name: 'Golden Bell', rarity: 'epic', value: 8000, probability: 8 },
      { name: 'Star of Winter', rarity: 'legendary', value: 25000, probability: 3.5 },
      { name: 'Santa's Gift', rarity: 'mythic', value: 100000, probability: 0.5 },
    ],
  },
];

async function runSeed() {
  console.log('🌱 Starting database seed...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const caseRepo = AppDataSource.getRepository('cases');
    const caseItemRepo = AppDataSource.getRepository('case_items');

    for (const caseData of cases) {
      const { items, ...caseFields } = caseData;

      const existing = await caseRepo.findOne({ where: { name: caseFields.name } });
      if (existing) {
        console.log(`⏭️  Case "${caseFields.name}" already exists, skipping`);
        continue;
      }

      const newCase = caseRepo.create(caseFields);
      const savedCase = await caseRepo.save(newCase);

      for (const item of items) {
        const caseItem = caseItemRepo.create({ ...item, caseId: savedCase.id, active: true });
        await caseItemRepo.save(caseItem);
      }

      console.log(`✅ Created case: ${caseFields.name} with ${items.length} items`);
    }

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeed();
