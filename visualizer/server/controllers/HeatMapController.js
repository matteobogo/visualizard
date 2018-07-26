const heatmaps = require('../services/HeatMaps');

const mime = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    json: 'application/json',
};

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const getHeatMap = async (req, res) => {

    let img_type = req.params.img_type
    ,   heatmap_type = req.params.heatmap_type
    ,   field = req.params.field;

    switch (img_type) {

        case 'png':
            //TODO
            break;

        case 'jpeg':
            //TODO
            break;

        default:
            res.setHeader('Content-Type', mime.json);
            return ReE(res, `${img_type} media type not supported`, 400);
    }
};

/**
 *
 * @param req
 * @param res
 * @returns {Promise<*>}
 */
const buildResourceUsageHeatMaps = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, type, dbname, policy, interval, fields, n_machines, period, response;

    type = req.params.type;
    dbname = req.params.dbname;
    policy = req.params.policy;

    interval = req.query.interval.split(',');
    fields = req.query.fields.split(',');
    n_machines = req.query.n_machines;
    period = req.query.period;


    // [err, response] = await to(
    //     heatmaps.buildHeatMapOrderByMachineId(
    //         'autogen',
    //         '2011-02-01T00:15:00.000Z',
    //         '2011-02-01T10:50:00.000Z',
    //         //'2011-03-01T10:50:00.000Z',
    //         resource_id,
    //         500
    //     ));

    [err, response] = await to(heatmaps.buildHeatMaps(
        {
            dbname: dbname,
            policy: policy,
            interval: interval,
            fields: fields,
            n_machines: n_machines,
            period: period,
            type: type,
        }
    ));

    //if(err) return ReE(res, err.message, 400);

    return ReS(res, {message: 'HeatMap built'}, 200);
};

module.exports = {
    getHeatMap: getHeatMap,
    buildResourceUsageHeatMaps: buildResourceUsageHeatMaps
};