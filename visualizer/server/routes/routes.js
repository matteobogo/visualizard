const express   = require('express')
    , router    = express.Router();

const HomeController = require('../controllers/HomeController');
const InfluxDBController = require('../controllers/InfluxDBController');
const AnalysisController = require('../controllers/AnalysisController');
const HeatMapController = require('../controllers/HeatMapController');

router.get('/', function(req, res, next) {
    res.json({
        status: "success",
        message: "Visualizard API",
        data: {"version": "v1.0"}
    })
});

router.get('/ping', HomeController.ping);

router.get('/influx/ping', InfluxDBController.ping);
router.get('/influx/databases', InfluxDBController.getDatabases);
router.get('/influx/policies', InfluxDBController.getAllPolicies);
router.get('/influx/fields', InfluxDBController.getAllFields);
router.get('/influx/firstInterval', InfluxDBController.getFirstInterval);
router.get('/influx/lastInterval', InfluxDBController.getLastInterval);
router.get('/influx/intervals', InfluxDBController.getFirstAndLastIntervals);
router.get('/influx/periods', InfluxDBController.getPeriods);
router.get('/influx/measurements', InfluxDBController.getMeasurements);
router.get('/influx/measurements/number', InfluxDBController.getNMeasurements);
router.get('/influx/measurements/:policy/:name/time/:field', InfluxDBController.getTimeIntervalByPolicyByNameByField);
router.get('/influx/measurements/:policy/:name/data', InfluxDBController.getDataByPolicyByName);
router.get('/influx/measurements/:database/:policy/:name/data/:time_start/:time_end', InfluxDBController.getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime);
router.get('/influx/measurements/:tag_key/:tag_value', InfluxDBController.getNamesByTagKeyByTagValue);

router.post('/analysis', AnalysisController.startDatasetAnalysis);
router.get('/analysis/statistics', AnalysisController.getAnalysisStatistics);
router.get('/analysis', AnalysisController.getAnalysis);

router.get('/heatmaps/bounds', HeatMapController.getHeatMapBounds);
router.get('/heatmaps/types', HeatMapController.getHeatMapTypes);
router.get('/heatmaps/zooms', HeatMapController.getZoomLevels);
router.get('/heatmaps/palettes', HeatMapController.getPalettes);
router.post('/heatmaps/zscores', HeatMapController.setHeatMapZscores);
router.get('/heatmaps/zscores', HeatMapController.getHeatMapZscore);
router.get('/heatmaps/status', HeatMapController.getHeatMapComputationStatus);
router.post('/heatmaps/stop', HeatMapController.stopHeatMapComputation);

router.get('/timeseries/:heatMapType/:timeSerieIndex', HeatMapController.getDataByMachineIdxByHeatMapType);

router.post('/admin/store-heatmap', HeatMapController.storeHeatMap);

module.exports = router;