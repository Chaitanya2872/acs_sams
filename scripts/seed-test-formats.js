require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const { TestFormat } = require('../src/models/schemas');
const { DEFAULT_TEST_FORMATS } = require('../src/data/testFormats');

async function seedTestFormats() {
  await connectDB();

  const operations = DEFAULT_TEST_FORMATS.map((format) => ({
    updateOne: {
      filter: { format_id: format.format_id },
      update: {
        $set: {
          ...format,
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date()
        }
      },
      upsert: true
    }
  }));

  const result = await TestFormat.bulkWrite(operations, { ordered: false });
  const total = await TestFormat.countDocuments();

  console.log('Test format seed complete');
  console.log(`Inserted: ${result.upsertedCount || 0}`);
  console.log(`Updated: ${result.modifiedCount || 0}`);
  console.log(`Total formats in database: ${total}`);
}

seedTestFormats()
  .catch((error) => {
    console.error('Failed to seed test formats:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => undefined);
  });
