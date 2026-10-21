require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PRIVATE_APP_ACCESS = process.env.PRIVATE_APP_ACCESS;
const CUSTOM_OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE; // e.g. 2-12345678
const BASE = 'https://api.hubapi.com';
const PROPERTIES = ['name', 'bio', 'plant_type'];

const headers = {
  Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
  'Content-Type': 'application/json',
};

// GET / - homepage: list all custom object records in a table
app.get('/', async (req, res) => {
  const url = `${BASE}/crm/v3/objects/${CUSTOM_OBJECT_TYPE}?limit=100&properties=${PROPERTIES.join(',')}`;
  try {
    const resp = await axios.get(url, { headers });
    res.render('homepage', {
      title: 'Plants | Integrating With HubSpot I Practicum',
      records: resp.data.results,
    });
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send('Could not load custom object records. Check the server console.');
  }
});

// GET /update-cobj - render the form
app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
  });
});

// POST /update-cobj - create a new record, then redirect home
app.post('/update-cobj', async (req, res) => {
  const body = {
    properties: {
      name: req.body.name,
      bio: req.body.bio,
      plant_type: req.body.plant_type,
    },
  };
  try {
    await axios.post(`${BASE}/crm/v3/objects/${CUSTOM_OBJECT_TYPE}`, body, { headers });
    res.redirect('/');
  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).send('Could not create the record. Check the server console.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));
