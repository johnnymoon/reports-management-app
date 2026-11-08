const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const DB_NAME = process.env.DB_NAME || 'testDB';
const COLLECTION_NAME = 'Reports';
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('Missing MONGODB_URI. Create server/.env from server/.env.example.');
  process.exit(1);
}

const client = new MongoClient(mongoUri);
let reports;

const fields = [
  'ReportType',
  'ReportTitle',
  'ReportDescription',
  'ReportDate',
  'ReportLocation',
  'ReportLGA',
  'ReportState',
  'ReportRegion'
];

const reportSchema = {
  bsonType: 'object',
  required: fields,
  properties: {
    ReportType: { bsonType: 'string' },
    ReportTitle: { bsonType: 'string' },
    ReportDescription: { bsonType: 'string' },
    ReportDate: { bsonType: 'date' },
    ReportLocation: { bsonType: 'string' },
    ReportLGA: { bsonType: 'string' },
    ReportState: { bsonType: 'string' },
    ReportRegion: { bsonType: 'string' }
  }
};

function validObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

function normalizeReport(body, partial = false) {
  const result = {};
  const supplied = fields.filter((field) => body[field] !== undefined);

  if (!partial) {
    const missing = fields.filter((field) =>
      body[field] === undefined || body[field] === null || String(body[field]).trim() === ''
    );
    if (missing.length) {
      return { error: `Missing required fields: ${missing.join(', ')}` };
    }
  } else if (supplied.length === 0) {
    return { error: 'Provide at least one report field to update.' };
  }

  for (const field of supplied) {
    const value = body[field];

    if (value === null || String(value).trim() === '') {
      return { error: `${field} cannot be empty.` };
    }

    if (field === 'ReportDate') {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return { error: 'ReportDate must be a valid date.' };
      }
      result[field] = date;
    } else {
      if (typeof value !== 'string') {
        return { error: `${field} must be a string.` };
      }
      result[field] = value.trim();
    }
  }

  return { value: result };
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Reports API is running.' });
});

// Create the Reports collection and its schema validator if it does not exist.
app.post('/api/create-reports-collection', async (_req, res, next) => {
  try {
    const existing = await reports.db.listCollections(
      { name: COLLECTION_NAME },
      { nameOnly: true }
    ).toArray();

    if (existing.length) {
      return res.status(200).json({
        success: true,
        message: 'Reports collection already exists.',
        collection: COLLECTION_NAME
      });
    }

    await reports.db.createCollection(COLLECTION_NAME, {
      validator: { $jsonSchema: reportSchema },
      validationLevel: 'strict',
      validationAction: 'error'
    });

    return res.status(201).json({
      success: true,
      message: 'Reports collection created successfully.',
      collection: COLLECTION_NAME,
      fields
    });
  } catch (error) {
    next(error);
  }
});

// List all reports, newest report date first.
app.get('/api/reports', async (_req, res, next) => {
  try {
    const data = await reports.find({}).sort({ ReportDate: -1 }).toArray();
    res.json({
      success: true,
      totalRecords: data.length,
      message: data.length ? 'Reports retrieved successfully.' : 'No reports found.',
      data
    });
  } catch (error) {
    next(error);
  }
});

// Retrieve one report.
app.get('/api/reports/:id', async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const data = await reports.findOne({ _id: new ObjectId(req.params.id) });
    if (!data) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({ success: true, message: 'Report retrieved successfully.', data });
  } catch (error) {
    next(error);
  }
});

// Create a report.
app.post('/api/reports', async (req, res, next) => {
  try {
    const normalized = normalizeReport(req.body);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const result = await reports.insertOne(normalized.value);
    const created = await reports.findOne({ _id: result.insertedId });

    res.status(201).json({
      success: true,
      message: 'Report captured successfully.',
      insertedId: result.insertedId,
      data: created
    });
  } catch (error) {
    next(error);
  }
});

// Update only fields supplied in the request.
app.put('/api/reports/:id', async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const normalized = normalizeReport(req.body, true);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }

    const result = await reports.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: normalized.value },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({ success: true, message: 'Report updated successfully.', data: result });
  } catch (error) {
    next(error);
  }
});

// Permanently delete a report.
app.delete('/api/reports/:id', async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid report ID.' });
    }

    const result = await reports.findOneAndDelete({
      _id: new ObjectId(req.params.id)
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({
      success: true,
      message: 'Report deleted successfully.',
      deletedId: req.params.id,
      deletedDocument: result
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : error.message
  });
});

async function start() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    reports = db.collection(COLLECTION_NAME);

    app.listen(PORT, () => {
      console.log(`Reports API running at http://localhost:${PORT}`);
      console.log(`Database: ${DB_NAME}; collection: ${COLLECTION_NAME}`);
    });
  } catch (error) {
    console.error('Could not connect to MongoDB:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});

start();
