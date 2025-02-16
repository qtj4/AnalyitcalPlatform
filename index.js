const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const Measurement = require('./models/measurement');
const Station = require('./models/station');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/measurements', async (req, res) => {
    try {
        const measurement = new Measurement(req.body);
        await measurement.save();
        res.status(201).json(measurement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/measurements', async (req, res) => {
    try {
        const { start_date, end_date, field } = req.query;
        if (!start_date || !end_date) {
            return res.status(400).json({ error: 'Missing required date parameters' });
        }
        const query = {
            timestamp: {
                $gte: new Date(start_date),
                $lte: new Date(end_date)
            }
        };
        const projection = field ? { timestamp: 1, [field]: 1 } : {};
        const measurements = await Measurement.find(query, projection).sort({ timestamp: 1 });
        res.json(measurements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/measurements/:id', async (req, res) => {
    try {
        const updatedMeasurement = await Measurement.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedMeasurement) {
            return res.status(404).json({ error: 'Measurement not found' });
        }
        res.json(updatedMeasurement);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/measurements/:id', async (req, res) => {
    try {
        const deletedMeasurement = await Measurement.findByIdAndDelete(req.params.id);
        if (!deletedMeasurement) {
            return res.status(404).json({ error: 'Measurement not found' });
        }
        res.json({ message: 'Measurement deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/measurements/metrics', async (req, res) => {
    try {
        const { field, startDate, endDate } = req.query;
        if (!field) {
            return res.status(400).json({ error: 'Field parameter is required' });
        }

        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.timestamp = {};
            if (startDate) dateFilter.timestamp.$gte = new Date(startDate);
            if (endDate) dateFilter.timestamp.$lte = new Date(endDate);
        }

        const metrics = await Measurement.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: null,
                    avg: { $avg: `$${field}` },
                    min: { $min: `$${field}` },
                    max: { $max: `$${field}` },
                    stdDev: { $stdDevPop: `$${field}` }
                }
            },
            {
                $project: {
                    _id: 0,
                    avg: { $round: ['$avg', 2] },
                    min: { $round: ['$min', 2] },
                    max: { $round: ['$max', 2] },
                    stdDev: { $round: ['$stdDev', 2] }
                }
            }
        ]);

        res.json(metrics[0] || { avg: 0, min: 0, max: 0, stdDev: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.get('/api/measurements/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter (q) is required for text search' });
        }
        const results = await Measurement.find({ $text: { $search: q } });
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stations/nearby', async (req, res) => {
    try {
        const { lng, lat, maxDistance } = req.query;

        if (!lng || !lat) {
            return res.status(400).json({ error: 'Longitude (lng) and latitude (lat) are required' });
        }

        const distance = maxDistance ? parseInt(maxDistance) : 5000;

        const nearbyStations = await Station.find({
            "location.coordinates": {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [parseFloat(lng), parseFloat(lat)]
                    },
                    $maxDistance: distance
                }
            }
        });
        console.log(parseFloat(lng), parseFloat(lat));
        res.json(nearbyStations);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/measurements/with-station', async (req, res) => {
    try {
        const measurements = await Measurement.find().populate('station');
        res.json(measurements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

mongoose.connect('mongodb://localhost:27017/analytics')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
