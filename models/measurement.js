const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
    {
        timestamp: {
            type: Date,
            required: true,
            index: true
        },
        field1: {
            type: Number,
            required: true
        },
        field2: {
            type: Number,
            required: true
        },
        field3: {
            type: Number,
            required: true
        },
        description: {
            type: String
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                default: 'Point'
            },
            coordinates: {
                type: [Number],
                index: '2dsphere'
            }
        },
        details: {
            windSpeed: Number,
            cloudiness: Number
        },
        station: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Station'
        }
    },
    {
        shardKey: { timestamp: 1, station: 1 }
    }
);

measurementSchema.index({ description: 'text' });

const Measurement = mongoose.model('Measurement', measurementSchema);
module.exports = Measurement;
