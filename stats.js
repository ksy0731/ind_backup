// 조회 API
const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
// const moment = require('moment-timezone');

// GET /api/stats/aggregate?type=daily
// GET /api/stats/aggregate?type=monthly
// GET /api/stats/aggregate?type=time
router.get('/aggregate', async (req, res) => {
  const { type } = req.query;

  let pipeline = [];

  // 공통: 배열 펼치기
  pipeline.push({ $unwind: "$behavior_data" });

  // 날짜 포맷 정의
  let dateFormat;
  if (type === 'daily') {
    dateFormat = "%Y-%m-%d";
  } else if (type === 'monthly') {
    dateFormat = "%Y-%m";
  } else if (type == 'time') {
    dateFormat = "%Y-%m-%d_%H-%M";
  } else {
    return res.status(400).json({ error: 'Invalid "type" parameter. Use "daily" or "monthly", or "time".' });
  }

  // 집계 파이프라인 추가
  pipeline.push({
    $group: {
      _id: {
        $dateToString: {
          format: dateFormat,
          date: "$video_data.capture_date"
        }
      },
      total_repetition: { $sum: "$behavior_data.repetition_count" }
    }
  });

  pipeline.push({ $sort: { _id: 1 } });

  // 에러 핸들링 포함
  try {
    const results = await Video.aggregate(pipeline);
    res.json(results);
  } catch (err) {
    console.error("Aggregation Error:", err);
    res.status(500).json({ error: 'Aggregation failed', detail: err.message });
  }
});

module.exports = router;
