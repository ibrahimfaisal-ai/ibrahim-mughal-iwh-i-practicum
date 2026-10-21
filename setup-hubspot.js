// One-time setup: creates the "Plants" custom object, 3 properties, 3 records,
// and associates each record with a contact. Run once with `npm run setup`.
// Requires PRIVATE_APP_ACCESS in .env with scopes:
//   crm.schemas.custom (r/w), crm.objects.custom (r/w), crm.objects.contacts (r/w)
require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const BASE = 'https://api.hubapi.com';
const headers = {
  Authorization: `Bearer ${process.env.PRIVATE_APP_ACCESS}`,
  'Content-Type': 'application/json',
};

const plants = [
  { name: 'Monstera', bio: 'Loves bright, indirect light and a weekly drink.', plant_type: 'Indoor' },
  { name: 'Lavender', bio: 'Sun-lover that keeps pollinators happy.', plant_type: 'Outdoor' },
  { name: 'Snake Plant', bio: 'Nearly indestructible; thrives on neglect.', plant_type: 'Indoor' },
];

async function main() {
  // 1. Create the custom object schema (with the 3 properties)
  const schema = await axios.post(`${BASE}/crm/v3/schemas`, {
    name: 'plants',
    labels: { singular: 'Plant', plural: 'Plants' },
    primaryDisplayProperty: 'name',
    requiredProperties: ['name'],
    properties: [
      { name: 'name', label: 'Name', type: 'string', fieldType: 'text' },
      { name: 'bio', label: 'Bio', type: 'string', fieldType: 'text' },
      { name: 'plant_type', label: 'Plant Type', type: 'string', fieldType: 'text' },
    ],
    associatedObjects: ['CONTACT'],
  }, { headers });
  const objectTypeId = schema.data.objectTypeId;
  console.log('Created schema, objectTypeId =', objectTypeId);

  // 2. Create a contact to associate with
  const contact = await axios.post(`${BASE}/crm/v3/objects/contacts`, {
    properties: { email: 'plant.lover@example.com', firstname: 'Plant', lastname: 'Lover' },
  }, { headers }).catch(async (e) => {
    // contact may already exist; look it up
    const s = await axios.post(`${BASE}/crm/v3/objects/contacts/search`, {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: 'plant.lover@example.com' }] }],
    }, { headers });
    return { data: s.data.results[0] };
  });
  const contactId = contact.data.id;

  // 3. Create 3 records and associate each with the contact
  for (const p of plants) {
    const rec = await axios.post(`${BASE}/crm/v3/objects/${objectTypeId}`, { properties: p }, { headers });
    await axios.put(
      `${BASE}/crm/v4/objects/${objectTypeId}/${rec.data.id}/associations/default/contacts/${contactId}`,
      {}, { headers });
    console.log(`Created ${p.name} (id ${rec.data.id}) and associated with contact ${contactId}`);
  }

  // 4. Save the object type id into .env for index.js
  let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
  env = env.replace(/^CUSTOM_OBJECT_TYPE=.*$/m, '').trim();
  fs.writeFileSync('.env', `${env}\nCUSTOM_OBJECT_TYPE=${objectTypeId}\n`);
  console.log('\nSaved CUSTOM_OBJECT_TYPE to .env.');
  console.log(`List view URL: https://app.hubspot.com/contacts/<YOUR-TEST-ACCOUNT-ID>/objects/${objectTypeId}/views/all/list`);
}

main().catch((e) => {
  console.error(e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
  process.exit(1);
});
