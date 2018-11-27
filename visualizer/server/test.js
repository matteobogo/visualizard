const expect = require('chai').expect;
const config = require('./config/config');
const mongoose = require('mongoose');
const redis = require('./cache/redis');

const constants = require('./utils/constants');

const datasetAnalysisService = require('./services/AnalysisService');
const heatMapService = require('./services/HeatMapsService');

const influxdb = require('./database/influxdb');

//tip: passing arrow functions to Mocha is discouraged

//

describe('Dataset Analysis Service', function() {

    this.timeout(3600000);  //60min

    before(function() {

        if (mongoose.connection.readyState === 0) {
            mongoose.connect(
                `mongodb://${config.MONGO.db_host}/${config.MONGO.db_name}`, function(err) {

                    if (err)
                        throw err;
                });
        }
    });

    // describe('get analysis cached', function() {
    //
    //     const params =
    //         {
    //             database: "google_cluster",
    //             policy: "autogen",
    //             startInterval: "2011-02-01T00:15:00.000Z",
    //             endInterval: "2011-02-01T00:30:00.000Z",
    //             analysisType: datasetAnalysisService._ANALYSIS_TYPES.POINTS_STATS_PER_TIMESTAMP_ANALYSIS
    //         };
    //
    //     it('dataset analysis completed', function() {
    //
    //         datasetAnalysisService
    //             .getAnalysisCached(params)
    //             .then(res => {
    //                 console.log(res);
    //             })
    //             .catch(err => {
    //                 console.log(err);
    //             })
    //     })
    // })

    // describe('Analyze Dataset', function() {
    //
    //     it('Dataset is analyzed', function() {
    //
    //         const params = {
    //             database: 'google_cluster',
    //             policy: 'autogen',
    //             startInterval: '2011-02-01T00:15:00.000Z',
    //             endInterval: '2011-03-01T10:50:00.000Z',  //8192 intervals
    //             period: 300,
    //             nMeasurements: 0 // 0 means all the time series
    //         };
    //
    //         datasetAnalysisService
    //             .analyzeDataset(params)
    //             .then(function(response) {
    //
    //                 expect(response).to.be.a('boolean');
    //                 expect(response).to.equal(true);
    //             })
    //             .catch(function(error) {
    //                 console.log(error.message);
    //             });
    //     });
    // });

    //test heatmap image fetcher
    // describe('Testing HeatMap Image Fetcher Service', function() {
    //
    //     it('HeatMap 64 base encoding fetched', function() {
    //
    //          const params = {
    //              database: 'google_cluster',
    //              policy: 'autogen',
    //              startInterval: '2011-02-01T00:15:00.000Z',
    //              endInterval: '2011-03-01T10:50:00.000Z',  //8192 intervals
    //              fields: ["mean_cpu_usage_rate"],
    //              nMeasurements: 10, //all the time series
    //              period: 300,
    //              heatMapType: "sortByMachine",
    //              palette: 'GRAY',
    //          };
    //
    //          heatMapService
    //              .heatMapFetcher({ heatMapRequest: params })
    //              .then(data => {
    //                  console.log(data);
    //              })
    //              .catch(err => {
    //                  console.log(err);
    //              })
    //     });
    // });

    //test build heatmap
    // describe('Testing HeatMap building service', function() {
    //
    //     it('HeatMap Image built', function() {
    //
    //          const params = {
    //              database: 'google_cluster',
    //              policy: 'autogen',
    //              startInterval: '2011-02-01T00:15:00.000Z',
    //              endInterval: '2011-03-01T10:50:00.000Z',  //8192 intervals
    //              fields: ["mean_cpu_usage_rate"],
    //              nMeasurements: 0, //all the time series
    //              period: 300,
    //              heatMapType: 'SORT_BY_MACHINE',
    //              palette: 'GRAY',
    //          };
    //
    //          heatMapService.
    //             heatMapBuildAndStore(
    //                 params,
    //                 constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT
    //          )
    //              .then(data => {
    //                  console.log(data);
    //              })
    //              .catch(err => {
    //                  console.log(err);
    //              });
    //     });
    // });

    // describe('Testing getPointsBatchByDatabaseByPolicyByMultiNameByStartTimeByEndTime', function() {
    //
    //     it('Batch of points fetched', function() {
    //
    //          influxdb.fetchPointsFromHttpApi(
    //              'google_cluster',
    //              'autogen',
    //              ['resource_usage_10', 'resource_usage_5'],
    //              '2011-02-01T00:15:00.000Z',
    //              '2011-03-01T10:50:00.000Z',
    //              300,
    //              ['mean_cpu_usage_rate']
    //          )
    //              .then(data => {
    //                  console.log(data);
    //              })
    //              .catch(err => {
    //                  console.log(err);
    //              });
    //     });
    // });

    describe('Testing HeatMap Image Tiles Builder', function() {

        it('HeatMap Image Tiles built', function() {

             const request = {
                 database: 'google_cluster',
                 policy: 'autogen',
                 startInterval: '2011-02-01T00:15:00.000Z',
                 endInterval:   '2011-03-01T10:50:00.000Z',
                 fields: ["mean_cpu_usage_rate"],
                 nMeasurements: 0, //all the time series
                 period: 300,
                 heatMapType: 'SORT_BY_MACHINE',
                 palette: 'GRAY',
                 imageType: constants.IMAGE_EXTENSIONS.IMAGE_PNG_EXT,
                 mode: constants.HEATMAPS.MODES.TILES,
                 zScore: 3,
             };

             heatMapService.heatMapBuildAndStore({request: request})
                 .then(res => console.log(res))
                 .catch(err => console.log(err));
        });
    });
});