const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

// 🔐 GANTI DENGAN API KEY ANDA
const PTERODACTYL_API_KEY = 'ptla_jcE0KGJE6N4zZa7bcvZsQCrXjbu0TwBPCLZrBamX5uc'; // Dari Admin → Application → API Credentials
const PTERODACTYL_URL = 'https://ditzzznetwork.xuyanzi.my.id'; // Tanpa slash di akhir

app.use(express.static('public'));
app.use(express.json());

app.post('/api/create-server', async (req, res) => {
  try {
    const { name, userId, nestId, eggId, locationId, allocationId } = req.body;

    // Validasi input
    if (!name || !userId || !nestId || !eggId || !locationId || !allocationId) {
      return res.status(400).json({ error: 'Semua field wajib diisi' });
    }

    // Ambil detail egg untuk mendapatkan docker image dan startup command
    const eggRes = await axios.get(`${PTERODACTYL_URL}/api/application/nests/${nestId}/eggs/${eggId}?include=variables`, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const egg = eggRes.data.attributes;

    const serverData = {
      name: name,
      user: userId,
      nest: nestId,
      egg: eggId,
      docker_image: egg.docker_image,
      startup: egg.startup,
      oom_disabled: false,
      limits: {
        memory: 1024,
        swap: 0,
        disk: 5120,
        io: 500,
        cpu: 100
      },
      feature_limits: {
        databases: 2,
        allocations: 1,
        backups: 3
      },
      deploy: {
        locations: [locationId],
        dedicated_ip: false,
        port_range: [],
        allocation: allocationId
      },
      environment: egg.relationships.variables.data.reduce((env, variable) => {
        env[variable.attributes.env_variable] = variable.attributes.default_value || '';
        return env;
      }, {})
    };

    // Buat server
    const createRes = await axios.post(`${PTERODACTYL_URL}/api/application/servers`, serverData, {
      headers: {
        'Authorization': `Bearer ${PTERODACTYL_API_KEY}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    res.json({
      id: createRes.data.data.attributes.id,
      name: createRes.data.data.attributes.name,
      uuid: createRes.data.data.attributes.uuid
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Gagal membuat server',
      details: error.response?.data?.errors?.[0]?.detail || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
