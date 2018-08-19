const expect = require('chai').expect;
const config = require('./config/config');
const mongoose = require('mongoose');
const redis = require('./cache/redis');

const datasetAnalysisService = require('./services/DatasetAnalysisService');

//tip: passing arrow functions to Mocha is discouraged

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
    //             analysisType: datasetAnalysisService._ANALYSIS_TYPES.DATASET_ANALYSIS
    //         };
    //
    //     it('dataset analysis completed', function() {
    //
    //         datasetAnalysisService
    //             .getAnalysisCached(params,
    //                 (error, analysis) => { //error first callback pattern
    //                     if (error) {
    //
    //                         console.log(error);
    //                     }
    //                     else {
    //
    //                         console.log(analysis);
    //                     }
    //                 })
    //     })
    // })

    describe('Analyze Dataset', function() {

        it('Dataset is analyzed', function() {

            const params = {
                database: 'google_cluster',
                policy: 'autogen',
                startInterval: '2011-02-01T00:15:00.000Z',
                endInterval: '2011-03-01T10:50:00.000Z',  //8192 intervals
                period: 300,
                nMeasurements: 10 //all the time series
            };

            datasetAnalysisService
                .analyzeDataset(params)
                .then(function(response) {

                    expect(response).to.be.a('boolean');
                    expect(response).to.equal(true);
                })
                .catch(function(error) {
                    console.log(error.message);
                });
        });
    });
});