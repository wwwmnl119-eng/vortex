const router = require('express').Router();

// Public endpoint - no auth needed
router.get('/', (req, res) => {
  res.json({
    latest_version: process.env.LATEST_VERSION || '1.0.0',
    min_version: process.env.MIN_VERSION || '1.0.0',
    force_update: process.env.FORCE_UPDATE === 'true',
    update_url: process.env.APK_URL || '',
    changelog: process.env.CHANGELOG || 'Исправления ошибок и улучшения',
    store_url_android: process.env.STORE_URL_ANDROID || '',
    store_url_ios: process.env.STORE_URL_IOS || '',
  });
});

module.exports = router;
