const gf = require('../utils/global_functions');
const constants = require('../utils/constants');
const config = require('../config/config');

const logger = require('../config/winston');

const influxdb = require('../database/influxdb');
const heatMapService = require('../services/HeatMapsService');

const getDataByMachineIdxByHeatMapType = async (
    {
        database = gf.checkParam`Database`,
        policy = gf.checkParam`Policy`,
        startInterval = gf.checkParam`Start Interval`,
        endInterval = gf.checkParam`End Interval`,
        fields = gf.checkParam`Fields`,
        heatMapType = gf.checkParam`HeatMap Type`,
        timeSerieIndex = gf.checkParam`Timeserie Index`,
    }) => {

    //validation
    await heatMapService.heatMapConfigurationValidation({
        database: database,
        policy: policy,
        startInterval: startInterval,
        endInterval: endInterval,
        fields: fields,
    });

    if (!heatMapService.getHeatMapTypes().includes(heatMapType))
        throw Error(`invalid param: HeatMap Type ${heatMapType}`);

    //fetch timeseries names from db
    let timeseriesNames = await
            influxdb.fetchMeasurementsListFromHttpApi(database)
                .catch(err => {
                    logger.log('error', `Failed during measurements list fetching: ${err}`);
                });
    if (!timeseriesNames || timeseriesNames.length === 0) throw Error(`no timeseries available`);

    if (timeSerieIndex < 0 || timeSerieIndex > (timeseriesNames.length - 1))
        throw Error(`invalid param: Machine Index ${machineIdx}`);

    //step 1: retrieve the timeserie name (e.g. resource_usage_10), according to heatmap type and a given index
    //different heatmap types (e.g. sort by sum) associate different indexes to timeseries
    switch(heatMapType) {

        case constants.HEATMAPS.TYPES.SORT_BY_MACHINE: //the natural order

            break;

        case constants.HEATMAPS.TYPES.SORT_BY_SUM:

            //TODO sort according, may saves the sorting order in the database when doing analysis?
            break;

        case constants.HEATMAPS.TYPES.SORT_BY_TS_OF_MAX_VALUE:

            //TODO
            break;
    }

    const indexedTimeSerie = timeseriesNames[timeSerieIndex];

    logger.log('info', `fetching data of timeserie ${indexedTimeSerie}`);

    let timeSerieData = await influxdb.fetchPointsFromHttpApi({
        database: database,
        policy: policy,
        measurements: [indexedTimeSerie],
        startInterval: startInterval,
        endInterval: endInterval,
        period: config.TIMESERIES.period,
        fields: fields,
    })
        .catch(err => {
            logger.log('error', `Failed during points fetching for ${indexedTimeSerie}: ${err}`);
        });

    //we have a batch of measurements where each entry contains the points of each measurement
    if (!timeSerieData || timeSerieData.length === 0) throw Error(`no data available for ${indexedTimeSerie}`);

    //flatting ('cos we have requested only 1 timeserie)
    const points = timeSerieData[0].map(e => {

        let data = [e.time.getTime()];    //convert to unix epoch
        fields.forEach((field, idx) => data.push(e[field])); //take only requested fields

        return data;
    });
    if (!points || points.length === 0) throw Error(`no points available for ${indexedTimeSerie}`);

    return {
        name: indexedTimeSerie,
        fields: ['time'].concat(fields),
        points: points,
    };
};

module.exports = {
    getDataByMachineIdxByHeatMapType: getDataByMachineIdxByHeatMapType,
};