const express   = require('express')
    , router    = express.Router();

const HomeController = require('../controllers/HomeController');
const TimeSeriesController = require('../controllers/TimeseriesController');
const HeatMapController = require('../controllers/HeatMapController');

router.get('/', function(req, res, next) {
    res.json({
        status: "success",
        message: "Visualizard API",
        data: {"version": "v1.0"}
    })
});

router.get('/ping', HomeController.ping);

router.get('/influx/ping', TimeSeriesController.ping);
router.get('/influx/databases', TimeSeriesController.getDatabases);
router.get('/influx/policies', TimeSeriesController.getAllPolicies);
router.get('/influx/fields', TimeSeriesController.getAllFields);
router.get('/influx/firstInterval', TimeSeriesController.getFirstInterval);
router.get('/influx/lastInterval', TimeSeriesController.getLastInterval);
router.get('/influx/periods', TimeSeriesController.getPeriods);
router.get('/influx/measurements', TimeSeriesController.getMeasurements);
router.get('/influx/measurements/:policy/:name/time/:field', TimeSeriesController.getTimeIntervalByPolicyByNameByField);
router.get('/influx/measurements/:policy/:name/data', TimeSeriesController.getDataByPolicyByName);
router.get('/influx/measurements/:policy/:name/data/:time_start/:time_end', TimeSeriesController.getPointsByPolicyByNameByStartTimeByEndTime);
router.get('/influx/measurements/:tag_key/:tag_value', TimeSeriesController.getNamesByTagKeyByTagValue);

router.get('/heatmaps/palettes', HeatMapController.getPalettes);
router.get('/heatmaps/:heatmap_type/:field/:img_type', HeatMapController.getHeatMap);
router.get('/heatmaps', HeatMapController.buildResourceUsageHeatMaps);


// api_v1.route('/').get(function (req, res) {
//     res.render('index');
// });





module.exports = router;