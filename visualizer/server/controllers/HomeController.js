influx = require('../database/influxdb');

const timeout = 5000

const ping = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let err, hosts;
    [err, hosts] = await to(influx.ping(timeout));

    if(err) return ReE('error pinging the database');

    let ping_json;
    hosts.forEach(host => {
        if(host.online) {
            ping_json = { time: host.rtt };
        }
    });

    return ReS(res, ping_json, 200);
}

module.exports = {
    ping: ping
};