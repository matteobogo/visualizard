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
    //res.setHeader('Content-Type', 'image/png');

    let err, type, dbname, policy, fields, n_measurements, period;

    type = req.query.type;
    dbname = req.query.dbname;
    policy = req.query.policy;
    fields = req.query.fields.split(',');
    n_measurements = req.query.n_measurements;
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

    let interval = req.query.interval.split(',');
    if (interval.length !== 2)
        return ReE(res, {message: 'two timestamps are required'}, 400);

    let body = await heatmaps.entrypoint(

        dbname,
        policy,
        interval[0],
        interval[1],
        fields,
        n_measurements,
        period,
        type
    )
        .then(data => {
            res.set('Content-Type', 'image/png');
			res.send(data);
        });

    //TODO gestisci error (non usare to() perche vale solo per i JSON
    //TODO cambia da fields a richiesta su singolo field
    //TODO rivedi in heatmaps.js la catena di return ed elimina i for sui fields

    // res.set('Content-Type', 'image/png');
    // res.send(body);
        // .then(result => {
        //     console.log(result);
        //     return ReS(res, result, 200);
        // })
        // .catch(err => {
			// console.log(err);
        //     return ReE(res, err.message, 400);
        // });
};

module.exports = {
    getHeatMap: getHeatMap,
    buildResourceUsageHeatMaps: buildResourceUsageHeatMaps
};