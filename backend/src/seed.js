import User from './models/User.js';

export async function seedAdmin() {
  const email = process.env.SEED_EMAIL || 'admin@kharcha.local';
  const exists = await User.exists({ email });
  if (exists) return;

  await User.create({
    email,
    password: process.env.SEED_PASSWORD || 'kharcha@123',
    name:     process.env.SEED_NAME     || 'Admin',
  });
  console.log(`Seeded admin user: ${email}`);
}
