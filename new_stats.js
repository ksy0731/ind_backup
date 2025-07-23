// 조회 API
const express = require('express');
const router = express.Router();
const Video = require('../models/Video');

// GET /api/stats/aggregate?type=daily
// GET /api/stats/aggregate?type=monthly&year=2025
// GET /api/stats/aggregate?type=weekly&dates=2025-07-10,2025-07-11,...
// GET /api/stats/aggregate?type=time&date=2025-07-21

router.get('/aggregate', async (req, res) => {
  const { type, year, dates, date } = req.query;
  const pipeline = [];

  if (type === 'monthly' && year) {
    pipeline.push(
      { $unwind: "$behavior_data" },
      { $match: { "video_data.capture_date": { $regex: `^${year}` } } },
      {
        $group: {
          _id: { $substr: ["$video_data.capture_date", 0, 7] },
          total_repetition: { $sum: "$behavior_data.repetition_count" }
        }
      },
      { $sort: { _id: 1 } }
    );
  } else if (type === 'weekly' && dates) {
    const dateArray = dates.split(',');
    pipeline.push(
      { $unwind: "$behavior_data" },
      { $match: { "video_data.capture_date": { $in: dateArray } } },
      {
        $group: {
          _id: "$video_data.capture_date",
          total_repetition: { $sum: "$behavior_data.repetition_count" }
        }
      },
      { $sort: { _id: 1 } }
    );
  } else if (type === 'time') {
    pipeline.push({ $unwind: "$behavior_data" });

    // ✅ 날짜 필터 추가
    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      pipeline.push({
        $match: {
          "video_data.capture_date": {
            $gte: start,
            $lte: end
          }
        }
      });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d_%H-%M",
              date: "$video_data.capture_date"
            }
          },
          total_repetition: { $sum: "$behavior_data.repetition_count" }
        }
      },
      { $sort: { _id: 1 } }
    );
  } else {
    return res.status(400).json({ error: 'Invalid "type" parameter or missing required parameters.' });
  }

  try {
    const results = await Video.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    console.error("Aggregation Error:", err);
    res.status(500).json({ error: 'Aggregation failed', detail: err.message });
  }
});

module.exports = router;
