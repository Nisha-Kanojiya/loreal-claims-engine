import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.claim.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} claim(s) already present.`);
    return;
  }

  await prisma.claim.create({
    data: {
      productName: 'Revitalift Pro-Retinol Serum 1.0',
      claimText: 'Reduces the appearance of wrinkles by 20% in 4 weeks',
      claimType: 'ANTI_AGING',
      formula: 'Aqua, Glycerin, Retinol 0.3%, Niacinamide 2%, Hyaluronic Acid 0.5%, Dimethicone, Tocopherol',
      status: 'ASSESSED',
      submittedBy: 'Dr. Camille Fournier (R&I Paris)',
      assessments: {
        create: {
          studyTitle: 'Randomized double-blind vehicle-controlled study of 0.3% retinol serum (N=120)',
          methodology:
            '120 female volunteers aged 40-60 applied the serum twice daily for 4 weeks. Wrinkle depth measured by PRIMOS 3D optical profilometry at baseline and week 4, plus expert-graded standardized photography.',
          resultsSummary:
            'Mean wrinkle depth reduction of 21.3% vs 3.1% for vehicle (p<0.001). 87% of subjects showed measurable improvement. No significant irritation events; 2 unrelated dropouts.',
          sampleSize: 120,
          durationWeeks: 4,
          justified: true,
          confidence: 0.92,
          reasoning:
            'The study is randomized, double-blind and vehicle-controlled with an adequate sample (N=120) and objective instrumental measurement (PRIMOS 3D profilometry). The observed 21.3% mean reduction at 4 weeks statistically exceeds the claimed 20% threshold, and the study duration matches the claim. The study therefore substantiates the claim under EU 1223/2009 evidential-support criteria.',
          model: 'seed',
        },
      },
    },
  });

  await prisma.claim.create({
    data: {
      productName: 'Hydra Genius Aloe Water Gel',
      claimText: 'Provides 72-hour continuous hydration after one application',
      claimType: 'HYDRATION',
      formula: 'Aqua, Aloe Barbadensis Leaf Juice, Glycerin, Hyaluronic Acid 0.2%, Panthenol',
      status: 'FORMULATION_TESTING',
      submittedBy: 'Dr. Yuki Tanaka (R&I Tokyo)',
    },
  });

  await prisma.claim.create({
    data: {
      productName: 'Elseve Bond Repair Shampoo',
      claimText: 'Repairs 98% of hair breakage after first use',
      claimType: 'HAIR_REPAIR',
      status: 'SCREENED',
      submittedBy: 'Business Team - Haircare Division',
    },
  });

  console.log('Seeded 3 claims (1 assessed, 2 in pipeline).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
