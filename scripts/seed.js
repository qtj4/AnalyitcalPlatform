const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

mongoose.connect('mongodb://localhost:27017/analytics')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const Measurement = require('../models/measurement');
const Station = require('../models/station');

const OPENWEATHER_API_KEY = '296659ff38b4b23b84c9d4e482a7f452';
const CITY = 'Astana';
const COUNTRY_CODE = 'KZ';

async function seedStation() {
    const station = new Station({
        name: 'Astana Weather Station',
        code: 'AST-001',
        location: {
            type: 'Point',
            coordinates: [71.4491, 51.1694]
        }
    });
    await station.save();
    console.log('Station seeded:', station);
    return station;
}

async function seedMeasurements(station) {
    await Measurement.deleteMany({});
    try {
        const response = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?q=${CITY},${COUNTRY_CODE}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        for (const item of response.data.list) {
            const measurement = new Measurement({
                timestamp: new Date(item.dt * 1000),
                field1: item.main.temp,
                field2: item.main.humidity,
                field3: item.main.pressure,
                description: item.weather[0].description,
                location: station.location,
                details: {
                    windSpeed: item.wind.speed,
                    cloudiness: item.clouds.all
                },
                station: station._id
            });
            await measurement.save();
            console.log(`Saved measurement for ${measurement.timestamp}`);
        }
        console.log('Weather data collection completed');
    } catch (error) {
        console.error('Error fetching or storing weather data:', error.message);
    }
}

async function seedAll() {
    const station = await seedStation();
    await seedMeasurements(station);
    mongoose.connection.close();
}

seedAll();
